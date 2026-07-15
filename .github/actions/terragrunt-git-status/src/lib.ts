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

// Hidden marker used to find and update the engine's help comment in place so
// it is posted once per PR rather than duplicated on every push.
const helpMarker = '<!-- terragrunt-engine:help -->';

// helpCommentBody renders the informational comment listing every way a user
// can interact with the Terragrunt engine on a PR. Keep this table current
// whenever a slash command or label trigger is added or changed.
function helpCommentBody(statusCheckName: string): string {
  return [
    helpMarker,
    '<details>',
    '<summary><b>Terragrunt engine</b> — commands and how it works</summary>',
    '',
    'This PR changes one or more Terraform stacks. Plans run automatically '
      + `on every push, and the \`${statusCheckName}\` status check blocks `
      + 'merge until the changes are applied.',
    '',
    '### Slash commands',
    '',
    'Comment on this PR to trigger these actions.',
    '',
    '| Command | What it does |',
    '| --- | --- |',
    '| `/apply-and-merge` | Runs `terragrunt apply` on every changed stack, '
      + 'then enables squash auto-merge once all stacks apply cleanly. '
      + 'Requires write access, at least one approval, no merge conflicts, '
      + 'and a non-draft PR. |',
    '| `/unlock` | Force-releases stuck Terraform state locks for the '
      + 'stacks changed by this PR. Requires write access. Use only when a '
      + 'previous run left a lock behind. |',
    '',
    '### How it works',
    '',
    '- Each changed stack is locked to this PR while it applies, so two PRs '
      + 'cannot apply the same stack at the same time.',
    `- The \`${statusCheckName}\` check stays pending until \`/apply-and-merge\` `
      + 'succeeds. A PR that changes no Terraform stacks passes it automatically.',
    '- If an apply fails, fix the issue, push, and run `/apply-and-merge` again.',
    '',
    '</details>',
    '',
  ].join('\n');
}

async function upsertHelpComment(
  octokit: Octokit,
  prNumber: number,
  statusCheckName: string,
): Promise<void> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    ...context.repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find(
    (c) => c.user?.type === 'Bot' && c.body?.includes(helpMarker),
  );
  const body = helpCommentBody(statusCheckName);

  if (existing) {
    await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated help comment ${existing.id}`);
    return;
  }

  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body,
  });
  core.info('Posted help comment');
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

  // Post the command help comment only when the engine is relevant to this PR
  // (i.e. it changes at least one stack), so docs-only PRs stay quiet.
  if (hasStacks) {
    await upsertHelpComment(octokit, prNumber, statusCheckName);
  }
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

  const applyingCommentId = await findApplyingComment(octokit, prNumber);

  if (allSucceeded) {
    let mergeStatus = '';
    try {
      await octokit.graphql(`
        mutation($prId: ID!) {
          enablePullRequestAutoMerge(input: {
            pullRequestId: $prId,
            mergeMethod: SQUASH
          }) {
            pullRequest { autoMergeRequest { enabledAt } }
          }
        }
      `, { prId: pr.nodeId });
      mergeStatus = 'Auto-merge enabled.';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      core.warning(`Auto-merge could not be enabled: ${msg}`);
      mergeStatus = `Auto-merge could not be enabled: ${msg}`;
    }

    const body = [
      `Apply succeeded for \`${pr.headSha.slice(0, 7)}\` — [workflow run](${url})`,
      '',
      mergeStatus,
    ].join('\n');

    await upsertComment(octokit, prNumber, applyingCommentId, body);

    await octokit.rest.repos.createCommitStatus({
      ...context.repo,
      sha: pr.headSha,
      state: 'success',
      context: statusCheckName,
      description: mergeStatus.startsWith('Auto-merge enabled')
        ? 'Applied — auto-merge enabled'
        : 'Applied — auto-merge failed (see PR comment)',
      target_url: url,
    });
  } else {
    const body = [
      `Apply failed for \`${pr.headSha.slice(0, 7)}\` — [workflow run](${url})`,
      '',
      'One or more stacks did not apply cleanly. Fix the issue and run `/apply-and-merge` again.',
    ].join('\n');

    await upsertComment(octokit, prNumber, applyingCommentId, body);

    await octokit.rest.repos.createCommitStatus({
      ...context.repo,
      sha: pr.headSha,
      state: 'failure',
      context: statusCheckName,
      description: 'Apply failed',
      target_url: url,
    });
  }

  return allSucceeded;
}

async function findApplyingComment(
  octokit: Octokit,
  prNumber: number,
): Promise<number | null> {
  const url = runUrl();
  const { data: comments } = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: prNumber,
    per_page: 50,
    sort: 'created',
    direction: 'desc',
  });

  const match = comments.find(
    (c) => c.user?.type === 'Bot' && c.body?.includes(url),
  );
  return match?.id ?? null;
}

async function upsertComment(
  octokit: Octokit,
  prNumber: number,
  commentId: number | null,
  body: string,
): Promise<void> {
  if (commentId) {
    await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: commentId,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body,
    });
  }
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

  const commentId = context.payload.comment?.id;
  if (commentId) {
    await octokit.rest.reactions.createForIssueComment({
      ...context.repo,
      comment_id: commentId,
      content: '+1',
    });
  }

  const headSha = pr.head.sha.slice(0, 7);

  await octokit.rest.repos.createCommitStatus({
    ...context.repo,
    sha: pr.head.sha,
    state: 'pending',
    context: 'terragrunt-apply',
    description: 'Applying...',
    target_url: runUrl(),
  });

  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `Applying \`${headSha}\` — [workflow run](${runUrl()})`,
  });

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
