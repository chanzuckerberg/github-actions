import * as core from '@actions/core';
import {
  makeClient,
  read,
  claim,
  release,
  reap,
} from './lib';

async function run(): Promise<void> {
  const operation = core.getInput('operation', { required: true });
  const stacksRaw = core.getInput('stacks') || '[]';
  const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY || '';
  const prNumber = core.getInput('pr_number');
  const prSha = core.getInput('pr_sha');
  const actor = core.getInput('actor');
  const table = core.getInput('authority_table', { required: true });
  const region = core.getInput('aws_region') || 'us-west-2';
  const maxAgeDays = parseInt(core.getInput('max_claim_age_days') || '30', 10);

  if (!repo) {
    throw new Error(
      'repo input is required (or GITHUB_REPOSITORY must be set)',
    );
  }

  const client = makeClient(region);
  let stacks: string[];

  try {
    stacks = JSON.parse(stacksRaw);
  } catch {
    throw new Error(`stacks input must be valid JSON array, got: ${stacksRaw}`);
  }

  switch (operation) {
    case 'read': {
      if (stacks.length === 0) {
        throw new Error('stacks input is required for read operation');
      }

      const actionVerb = core.getInput('action_verb') || '';
      const skipIfOwned = core.getInput('skip_if_owned') === 'true';
      const results: Record<string, unknown> = {};
      let proceed = true;

      for (const stack of stacks) {
        const result = await read(client, table, repo, stack);
        if (result.exists && result.record) {
          results[stack] = result.record;
        } else {
          results[stack] = { ownerRef: 'main' };
        }
        const rec = result.record;
        const owner = rec?.ownerRef ?? 'main';
        const ownerLabel = owner === 'main' ? 'main' : `PR #${rec?.prNumber}`;
        core.info(`${stack}: owned by ${ownerLabel}`);

        if (owner === 'pr' && rec?.prNumber) {
          if (skipIfOwned) {
            core.warning(`Skipping ${stack} — owned by PR #${rec.prNumber}`);
            proceed = false;
          } else {
            core.warning(
              `${stack} is owned by PR #${rec.prNumber} — this operation may be misleading`,
            );
          }
        }
      }

      core.setOutput('results', JSON.stringify(results));
      core.setOutput('proceed', String(proceed));
      break;
    }

    case 'claim': {
      if (stacks.length === 0) {
        throw new Error('stacks input is required for claim operation');
      }
      if (!prNumber) {
        throw new Error('pr_number is required for claim operation');
      }

      const results: Record<string, unknown> = {};
      let allClaimed = true;

      for (const stack of stacks) {
        const result = await claim(
          client,
          table,
          repo,
          stack,
          prNumber,
          prSha,
          actor,
        );
        results[stack] = {
          claimed: result.claimed,
          blockedByPr: result.blockedByPr,
        };

        if (result.claimed) {
          core.info(`${stack}: claimed by PR #${prNumber}`);
        } else {
          core.error(
            `${stack}: blocked — owned by PR #${result.blockedByPr}`,
          );
          allClaimed = false;
        }
      }

      core.setOutput('results', JSON.stringify(results));
      if (!allClaimed) {
        core.setFailed(
          'One or more stacks could not be claimed (owned by another PR)',
        );
      }
      break;
    }

    case 'release': {
      if (stacks.length === 0 && !prNumber) {
        throw new Error(
          'stacks input or pr_number is required for release operation',
        );
      }

      const results: Record<string, unknown> = {};
      for (const stack of stacks) {
        await release(client, table, repo, stack);
        results[stack] = { released: true };
        core.info(`${stack}: released (owner reset to main)`);
      }

      core.setOutput('results', JSON.stringify(results));
      break;
    }

    case 'reap': {
      core.info(
        `Reaping stale claims for ${repo} (max age: ${maxAgeDays} days)`,
      );
      const result = await reap(client, table, repo, maxAgeDays);

      for (const stack of result.reaped) {
        core.info(`Reaped: ${stack}`);
      }
      for (const stack of result.skipped) {
        core.info(`Skipped (fresh): ${stack}`);
      }

      core.setOutput('results', JSON.stringify(result));
      break;
    }

    default:
      throw new Error(
        `Unknown operation: ${operation}. Must be one of: read, claim, release, reap`,
      );
  }
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
