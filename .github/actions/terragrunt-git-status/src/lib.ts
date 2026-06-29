import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export interface PrContext {
  number: number;
  headSha: string;
  nodeId: string;
}

export function detectPrNumber(): number | null {
  const n = context.payload.pull_request?.number
    ?? context.payload.issue?.number;
  return typeof n === 'number' ? n : null;
}

export async function fetchPrContext(
  octokit: Octokit,
  prNumber: number,
): Promise<PrContext> {
  const { data: pr } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: prNumber,
  });
  return {
    number: prNumber,
    headSha: pr.head.sha,
    nodeId: pr.node_id,
  };
}

function runUrl(): string {
  const base = process.env.GITHUB_SERVER_URL || 'https://github.com';
  return `${base}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
}

export async function seed(
  octokit: Octokit,
  stacks: string[],
  statusCheckName: string,
): Promise<void> {
  const prNumber = detectPrNumber();
  if (!prNumber) {
    core.info('No PR context — skipping status seed');
    return;
  }

  const pr = await fetchPrContext(octokit, prNumber);
  const hasStacks = stacks.length > 0;

  await octokit.rest.repos.createCommitStatus({
    ...context.repo,
    sha: pr.headSha,
    state: hasStacks ? 'pending' : 'success',
    context: statusCheckName,
    description: hasStacks
      ? 'Stacks changed — run /apply to unblock merge'
      : 'No Terraform stacks changed',
    target_url: runUrl(),
  });

  core.info(
    hasStacks
      ? `Seeded pending status on ${pr.headSha.slice(0, 7)}`
      : `Seeded success status on ${pr.headSha.slice(0, 7)} (no stacks changed)`,
  );
}

export async function finalize(
  octokit: Octokit,
  stacks: string[],
  statusCheckName: string,
  runResult: string,
): Promise<boolean> {
  const prNumber = detectPrNumber();
  if (!prNumber) {
    core.warning('No PR context — skipping finalize');
    return false;
  }

  const allSucceeded = runResult === 'success';

  if (stacks.length === 0) {
    core.info('No stacks changed — skipping finalize');
    return allSucceeded;
  }

  const pr = await fetchPrContext(octokit, prNumber);
  const url = runUrl();

  await octokit.rest.repos.createCommitStatus({
    ...context.repo,
    sha: pr.headSha,
    state: allSucceeded ? 'success' : 'failure',
    context: statusCheckName,
    description: allSucceeded
      ? 'All stacks applied successfully'
      : 'One or more stacks failed to apply',
    target_url: url,
  });

  if (allSucceeded) {
    core.info('All stacks succeeded — enabling auto-merge');
    try {
      await octokit.graphql(`
        mutation($prId: ID!) {
          enablePullRequestAutoMerge(input: {
            pullRequestId: $prId,
            mergeMethod: MERGE
          }) {
            pullRequest { autoMergeRequest { enabledAt } }
          }
        }
      `, { prId: pr.nodeId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      core.warning(`Auto-merge could not be enabled: ${msg}`);
    }
  } else {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: [
        'Apply failed — one or more stacks did not apply cleanly.',
        `See the [workflow run](${url}) for details.`,
        '',
        'Fix the issue and run `/apply` again.',
      ].join('\n'),
    });
  }

  return allSucceeded;
}
