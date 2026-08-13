import * as core from '@actions/core';
import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  decideRelease,
  findBackendFiles,
  parseBackendS3Block,
  parseLockInfo,
} from './lib';

/**
 * Identities terraform may have written to a lock's Who field for this job.
 * On ARC runners the pod hostname and the runner name are the same, but a
 * setup that runs steps outside the runner pod makes them diverge.
 */
function selfIdentities(): string[] {
  const user = os.userInfo().username;
  const hosts = [os.hostname(), process.env.RUNNER_NAME].filter(
    (h): h is string => Boolean(h),
  );
  return [...new Set(hosts)].map((h) => `${user}@${h}`);
}

async function run(): Promise<void> {
  const stackRootInput = core.getInput('stack-root', { required: true });
  const force = core.getBooleanInput('force');
  const createdAfterInput = core.getInput('created-after');

  let createdAfter: Date | undefined;
  if (createdAfterInput) {
    const parsed = new Date(createdAfterInput);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`created-after is not a valid timestamp: ${createdAfterInput}`);
    }
    createdAfter = parsed;
  }

  const self = selfIdentities();
  if (force) {
    core.info('force is set: deleting every lock row found, without ownership checks');
  } else {
    core.info(`Releasing only locks owned by ${self.join(' or ')}`);
  }

  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace) {
    throw new Error('GITHUB_WORKSPACE is not set');
  }

  const stackRoot = path.join(workspace, stackRootInput);
  if (!fs.existsSync(stackRoot) || !fs.statSync(stackRoot).isDirectory()) {
    throw new Error(`stack root is not a directory: ${stackRoot}`);
  }

  let foundAny = false;
  let skipped = 0;
  for (const backendPath of findBackendFiles(stackRoot)) {
    const backend = parseBackendS3Block(backendPath);
    if (!backend) {
      continue;
    }
    foundAny = true;
    const componentDir = path.dirname(backendPath);
    const lockId = `${backend.bucket}/${backend.key}`;

    core.info(`Checking DynamoDB lock for ${componentDir} (LockID=${lockId})`);

    const ddb = new DynamoDBClient({
      region: backend.region,
    });

    let getOut;
    try {
      getOut = await ddb.send(
        new GetItemCommand({
          TableName: backend.dynamodbTable,
          Key: { LockID: { S: lockId } },
          ConsistentRead: true,
        }),
      );
    } catch (err) {
      core.warning(
        `  Skipping ${componentDir}: DynamoDB get-item failed: ${String(err)}`,
      );
      continue;
    }

    if (!getOut.Item) {
      core.info('  No lock row for this state');
      continue;
    }

    const infoRaw = getOut.Item.Info?.S;
    core.info(`  Lock metadata (Info): ${infoRaw ?? '<missing>'}`);

    if (!force) {
      const decision = decideRelease({
        info: parseLockInfo(infoRaw),
        self,
        createdAfter,
      });
      if (!decision.release) {
        core.info(`  Keeping lock: ${decision.reason}`);
        skipped += 1;
        continue;
      }
      core.info(`  Lock is releasable: ${decision.reason}`);
    }

    core.info(
      `  Deleting lock row from ${backend.dynamodbTable} (same effect as terraform force-unlock for this backend)`,
    );
    try {
      await ddb.send(
        new DeleteItemCommand({
          TableName: backend.dynamodbTable,
          Key: { LockID: { S: lockId } },
        }),
      );
    } catch (err) {
      core.warning(
        `  Failed to delete lock for ${componentDir}: ${String(err)}`,
      );
      continue;
    }
    core.info(`  Released lock for ${componentDir}`);
  }

  if (!foundAny) {
    core.info(
      `No .tf file with a parsable backend "s3" block under ${stackRoot}; nothing to check`,
    );
  }
  if (skipped > 0) {
    core.info(`Left ${skipped} lock(s) in place because they are not owned by this job`);
  }
  core.info('Lock cleanup (DynamoDB) completed');
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
