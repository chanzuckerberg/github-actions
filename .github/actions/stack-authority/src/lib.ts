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

export interface ClaimScanItem {
  stack: string;
  record: AuthorityRecord;
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
 * Scan all active (non-main) authority claims for a repo without releasing
 * anything. Uses a DynamoDB Scan on the authority/<repo>/ prefix.
 *
 * The state-lock table's partition key is LockID (string) with no sort key,
 * so Query with begins_with is not possible. Since authority rows are sparse
 * (one per stack per repo, typically tens of rows in the whole table), a
 * filtered scan is acceptable.
 */
export async function scanClaims(
  client: DynamoDBClient,
  table: string,
  repo: string,
): Promise<ClaimScanItem[]> {
  const prefix = `authority/${repo}/`;
  const items: ClaimScanItem[] = [];

  let lastKey: Record<string, { S: string }> | undefined;
  do {
    const out = await client.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: 'begins_with(LockID, :prefix)',
        ExpressionAttributeValues: { ':prefix': { S: prefix } },
        ExclusiveStartKey: lastKey,
      }),
    );

    for (const item of out.Items ?? []) {
      const lockId = item.LockID?.S ?? '';
      const ownerRef = item.OwnerRef?.S ?? OWNER_MAIN;
      if (ownerRef === OWNER_MAIN) {
        continue;
      }
      const stack = lockId.replace(prefix, '');
      items.push({ stack, record: itemToRecord(item) });
    }

    lastKey = out.LastEvaluatedKey as Record<string, { S: string }> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Release all authority claims held by a specific PR. Returns the list of
 * stacks that were released.
 */
export async function releaseByPr(
  client: DynamoDBClient,
  table: string,
  repo: string,
  prNumber: string,
): Promise<string[]> {
  const claims = await scanClaims(client, table, repo);
  const released: string[] = [];

  for (const { stack, record } of claims) {
    if (record.prNumber === prNumber) {
      await release(client, table, repo, stack);
      released.push(stack);
    }
  }

  return released;
}

/**
 * Reap stale authority claims for a repo by age. A claim is stale if it is
 * older than maxAgeDays. Returns the list of reaped and skipped stacks.
 *
 * This only reaps by age. To also release claims from closed PRs, call
 * scanClaims() in the orchestrator and check PR state via the GitHub API.
 */
export async function reap(
  client: DynamoDBClient,
  table: string,
  repo: string,
  maxAgeDays: number,
): Promise<ReapResult> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const reaped: string[] = [];
  const skipped: string[] = [];

  for (const { stack, record } of await scanClaims(client, table, repo)) {
    const claimDate = record.claimedAt ? new Date(record.claimedAt) : null;
    if (!claimDate || claimDate < cutoff) {
      reaped.push(stack);
      await release(client, table, repo, stack);
    } else {
      skipped.push(stack);
    }
  }

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
