import * as core from '@actions/core';
import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import * as fs from 'fs';
import * as path from 'path';
import {
  findFoggTfFiles,
  parseBackendS3Block,
} from './lib';

async function run(): Promise<void> {
  const stackRootInput = core.getInput('stack-root', { required: true });

  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace) {
    throw new Error('GITHUB_WORKSPACE is not set');
  }

  const stackRoot = path.join(workspace, stackRootInput);
  if (!fs.existsSync(stackRoot) || !fs.statSync(stackRoot).isDirectory()) {
    throw new Error(`stack root is not a directory: ${stackRoot}`);
  }

  let foundAny = false;
  for (const foggPath of findFoggTfFiles(stackRoot)) {
    const backend = parseBackendS3Block(foggPath);
    if (!backend) {
      continue;
    }
    foundAny = true;
    const componentDir = path.dirname(foggPath);
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

    const infoRaw = getOut.Item.Info?.S ?? '<missing>';
    core.info(`  Stale lock metadata (Info): ${infoRaw}`);

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
      `No fogg.tf with a parsable backend "s3" block under ${stackRoot}; nothing to check`,
    );
  }
  core.info('Lock cleanup (DynamoDB) completed');
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
