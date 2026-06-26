import * as core from '@actions/core';
import * as fs from 'fs';
import * as github from '@actions/github';
import {
  makeClient,
  read,
  claim,
  release,
  releaseByPr,
  scanClaims,
} from './lib';

function getPrNumber(): string {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return '';
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
    return String(event.pull_request?.number ?? event.issue?.number ?? '');
  } catch {
    return '';
  }
}

async function run(): Promise<void> {
  const operation = core.getInput('operation', { required: true });
  const stacksRaw = core.getInput('stacks') || '[]';
  const repo = process.env.GITHUB_REPOSITORY!;
  const prNumber = getPrNumber();
  const prSha = process.env.GITHUB_SHA || '';
  const actor = process.env.GITHUB_ACTOR || '';
  const table = core.getInput('authority_table', { required: true });
  const region = core.getInput('aws_region') || 'us-west-2';
  const maxAgeDays = parseInt(core.getInput('max_claim_age_days') || '30', 10);

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

      const skipIfOwned = core.getInput('skip_if_owned') === 'true';
      const results: Record<string, unknown> = {};
      let proceed = true;

      for (const stack of stacks) {
        const result = await read(client, table, repo, stack);
        const rec = result.record;
        results[stack] = rec
          ? {
            owner_ref: rec.ownerRef,
            pr_number: rec.prNumber,
            pr_sha: rec.prSha,
            actor: rec.actor,
            claimed_at: rec.claimedAt,
          }
          : { owner_ref: 'main' };
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
          blocked_by_pr: result.blockedByPr,
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

      if (stacks.length > 0) {
        for (const stack of stacks) {
          await release(client, table, repo, stack);
          results[stack] = { released: true };
          core.info(`${stack}: released (owner reset to main)`);
        }
      } else {
        // No explicit stacks — release everything owned by this PR
        const released = await releaseByPr(client, table, repo, prNumber);
        for (const stack of released) {
          results[stack] = { released: true };
          core.info(`${stack}: released (owner reset to main)`);
        }
        if (released.length === 0) {
          core.info(`No stacks found owned by PR #${prNumber}`);
        }
      }

      core.setOutput('results', JSON.stringify(results));
      break;
    }

    case 'reap': {
      core.info(
        `Reaping stale claims for ${repo} (max age: ${maxAgeDays} days)`,
      );

      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is required for reap operation');
      }
      const octokit = github.getOctokit(token);
      const [repoOwner, repoName] = repo.split('/');
      const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

      const claims = await scanClaims(client, table, repo);
      const reaped: string[] = [];
      const skipped: string[] = [];

      for (const { stack, record } of claims) {
        let prClosed = false;
        try {
          const { data: pr } = await octokit.rest.pulls.get({
            owner: repoOwner,
            repo: repoName,
            pull_number: parseInt(record.prNumber, 10),
          });
          prClosed = pr.state !== 'open';
        } catch {
          core.warning(
            `Could not fetch PR #${record.prNumber} for ${stack}; treating as open`,
          );
        }

        const claimDate = record.claimedAt ? new Date(record.claimedAt) : null;
        const isStale = !claimDate || claimDate < cutoff;

        if (prClosed || isStale) {
          await release(client, table, repo, stack);
          reaped.push(stack);
          const reason = prClosed ? 'PR closed' : 'stale';
          core.info(`Reaped ${stack} (${reason})`);
        } else {
          skipped.push(stack);
          core.info(`Skipped (fresh, PR open): ${stack}`);
        }
      }

      core.setOutput('results', JSON.stringify({ reaped, skipped }));
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
