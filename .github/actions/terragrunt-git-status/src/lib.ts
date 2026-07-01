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

export async function gate(
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
      ? 'Stacks changed — run /apply-and-merge to unblock merge'
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
        'Fix the issue and run `/apply-and-merge` again.',
      ].join('\n'),
    });
  }

  return allSucceeded;
}

function issueCommentContext(): { commenter: string; prNumber: number } | null {
  const prNumber = context.payload.issue?.number;
  const commenter = context.payload.comment?.user?.login;
  if (!prNumber || !commenter) {
    core.info('Missing PR number or commenter in payload');
    return null;
  }
  return { commenter, prNumber };
}

async function requireWriteAccess(
  octokit: Octokit,
  commenter: string,
  prNumber: number,
  command: string,
): Promise<boolean> {
  const { data: perm } = await octokit.rest.repos.getCollaboratorPermissionLevel({
    ...context.repo,
    username: commenter,
  });
  if (['admin', 'write'].includes(perm.permission)) {
    return true;
  }
  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `\`/${command}\` requires write access.`,
  });
  return false;
}

export async function validateApply(octokit: Octokit): Promise<boolean> {
  const ctx = issueCommentContext();
  if (!ctx) {
    return false;
  }
  const { commenter, prNumber } = ctx;

  if (!(await requireWriteAccess(octokit, commenter, prNumber, 'apply-and-merge'))) {
    return false;
  }

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: prNumber,
  });
  if (!reviews.some((r) => r.state === 'APPROVED')) {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: '`/apply-and-merge` requires at least one approval.',
    });
    return false;
  }

  const { data: pr } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: prNumber,
  });
  if (pr.draft) {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: 'Cannot apply — the pull request is still a draft. Mark it as ready for review and try again.',
    });
    return false;
  }
  if (pr.mergeable_state === 'dirty' || pr.mergeable === false) {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: 'Cannot apply — the branch has conflicts with the base branch. Resolve them and try again.',
    });
    return false;
  }

  core.info(`Accepted /apply-and-merge from ${commenter}`);
  return true;
}

export async function validateUnlock(octokit: Octokit): Promise<boolean> {
  const ctx = issueCommentContext();
  if (!ctx) {
    return false;
  }
  const { commenter, prNumber } = ctx;

  if (!(await requireWriteAccess(octokit, commenter, prNumber, 'unlock'))) {
    return false;
  }

  core.info(`Accepted /unlock from ${commenter}`);
  return true;
}
