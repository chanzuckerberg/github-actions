import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';

export interface AuthorityRecord {
  ownerRef: string; // "main" or "pr"
  prNumber: string;
  prSha: string;
  actor: string;
  claimedAt: string; // ISO timestamp
}

export interface ClaimResult {
  claimed: boolean;
  blockedByPr: string;
  current?: AuthorityRecord;
}

export interface ReadResult {
  exists: boolean;
  record?: AuthorityRecord;
}

export interface ReapResult {
  reaped: string[];
  skipped: string[];
}

const OWNER_MAIN = 'main';

export function authorityKey(repo: string, stack: string): string {
  return `authority/${repo}/${stack}`;
}

export function makeClient(region: string): DynamoDBClient {
  return new DynamoDBClient({ region });
}

export async function read(
  client: DynamoDBClient,
  table: string,
  repo: string,
  stack: string,
): Promise<ReadResult> {
  const key = authorityKey(repo, stack);
  const out = await client.send(
    new GetItemCommand({
      TableName: table,
      Key: { LockID: { S: key } },
      ConsistentRead: true,
    }),
  );

  if (!out.Item) {
    return { exists: false };
  }

  return {
    exists: true,
    record: itemToRecord(out.Item),
  };
}

/**
 * Claim authority for a stack. Succeeds only if the current owner is "main"
 * (or no record exists) or the same PR already owns it. Uses a DynamoDB
 * conditional write to close the read-then-claim race.
 */
export async function claim(
  client: DynamoDBClient,
  table: string,
  repo: string,
  stack: string,
  prNumber: string,
  prSha: string,
  actor: string,
): Promise<ClaimResult> {
  const key = authorityKey(repo, stack);
  const now = new Date().toISOString();

  try {
    await client.send(
      new PutItemCommand({
        TableName: table,
        Item: {
          LockID: { S: key },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: prNumber },
          PrSha: { S: prSha },
          Actor: { S: actor },
          ClaimedAt: { S: now },
        },
        // Atomic: only write if no row exists, owner is main, or same PR owns it
        ConditionExpression:
          'attribute_not_exists(LockID) OR OwnerRef = :main OR PrNumber = :self',
        ExpressionAttributeValues: {
          ':main': { S: OWNER_MAIN },
          ':self': { S: prNumber },
        },
      }),
    );
    return { claimed: true, blockedByPr: '' };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // Another PR owns this stack — read who it is
      const current = await read(client, table, repo, stack);
      return {
        claimed: false,
        blockedByPr: current.record?.prNumber ?? 'unknown',
        current: current.record,
      };
    }
    throw err;
  }
}

/**
 * Release authority: reset owner to "main". Unconditional delete of the
 * authority row (absence of a row means main-owned).
 */
export async function release(
  client: DynamoDBClient,
  table: string,
  repo: string,
  stack: string,
): Promise<void> {
  const key = authorityKey(repo, stack);
  await client.send(
    new DeleteItemCommand({
      TableName: table,
      Key: { LockID: { S: key } },
    }),
  );
}

/**
 * Reap stale authority claims for a repo. A claim is stale if it is older
 * than maxAgeDays. Returns the list of reaped and skipped stacks.
 *
 * Uses a DynamoDB Scan with a FilterExpression on the authority/<repo>/ prefix.
 * The state-lock table's partition key is LockID (string) with no sort key,
 * so Query with begins_with is not possible. Since authority rows are sparse
 * (one per stack per repo, typically tens of rows in the whole table), a
 * filtered scan is acceptable.
 *
 * Note: the caller is responsible for checking whether the owning PR is
 * closed (via the GitHub API). This function only checks age. The index.ts
 * orchestrator handles the PR-closed check.
 */
export async function reap(
  client: DynamoDBClient,
  table: string,
  repo: string,
  maxAgeDays: number,
): Promise<ReapResult> {
  const prefix = `authority/${repo}/`;
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const reaped: string[] = [];
  const skipped: string[] = [];

  let lastKey: Record<string, { S: string }> | undefined;
  do {
    const out = await client.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: 'begins_with(LockID, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': { S: prefix },
        },
        ExclusiveStartKey: lastKey,
      }),
    );

    for (const item of out.Items ?? []) {
      const lockId = item.LockID?.S ?? '';
      const stack = lockId.replace(prefix, '');
      const ownerRef = item.OwnerRef?.S ?? OWNER_MAIN;

      if (ownerRef === OWNER_MAIN) {
        continue;
      }

      const claimedAt = item.ClaimedAt?.S;
      if (!claimedAt) {
        reaped.push(stack);
        await release(client, table, repo, stack);
        continue;
      }

      const claimDate = new Date(claimedAt);
      if (claimDate < cutoff) {
        reaped.push(stack);
        await release(client, table, repo, stack);
      } else {
        skipped.push(stack);
      }
    }

    lastKey = out.LastEvaluatedKey as
      | Record<string, { S: string }>
      | undefined;
  } while (lastKey);

  return { reaped, skipped };
}

function itemToRecord(
  item: Record<string, { S?: string }>,
): AuthorityRecord {
  return {
    ownerRef: item.OwnerRef?.S ?? OWNER_MAIN,
    prNumber: item.PrNumber?.S ?? '',
    prSha: item.PrSha?.S ?? '',
    actor: item.Actor?.S ?? '',
    claimedAt: item.ClaimedAt?.S ?? '',
  };
}
