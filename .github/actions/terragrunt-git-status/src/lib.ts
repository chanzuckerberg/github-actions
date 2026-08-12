import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { matchOwnedFiles, parseCodeowners } from 'codeowners-approval-check-action/src/codeowners';
import { decide } from 'codeowners-approval-check-action/src/decide';
import {
  getApprovers,
  listChangedFiles,
  readCodeownersAtBase,
  TeamExpander,
} from 'codeowners-approval-check-action/src/github';
import { FileOwnership } from 'codeowners-approval-check-action/src/types';

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

// The bot's mention handle. Commands are triggered by mentioning this handle in
// a PR comment. GitHub renders the app's bot login (terragrunt-bot[bot]) as
// @terragrunt-bot, but a user may type either form, so the parser accepts both.
const botMention = '@terragrunt-bot';

interface Command {
  name: string;
  summary: string;
}

// Single source of truth for the commands the engine understands. The help
// comment table (helpCommentBody) documents them in full; keep it in sync when
// adding a command here.
const commands: Command[] = [
  {
    name: 'apply-and-merge',
    summary: 'Apply every changed stack, then squash auto-merge on success.',
  },
  {
    name: 'unlock',
    summary: "Force-release stuck Terraform state locks for this PR's stacks.",
  },
  {
    name: 'help',
    summary: 'Post the help comment listing every command.',
  },
];

export interface ParsedComment {
  // Whether the comment mentions the bot at all. A comment that never names the
  // bot is ignored rather than treated as an unknown command.
  mentioned: boolean;
  // The first token after the mention, lowercased, or null when the mention has
  // no argument.
  command: string | null;
}

// parseComment extracts the requested subcommand from a PR comment body.
export function parseComment(body: string): ParsedComment {
  const mention = /@terragrunt-bot(?:\[bot\])?/i;
  if (!mention.test(body)) {
    return { mentioned: false, command: null };
  }
  const withArg = /@terragrunt-bot(?:\[bot\])?\s+(\S+)/i.exec(body);
  return {
    mentioned: true,
    command: withArg ? withArg[1].toLowerCase() : null,
  };
}

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
    '### Commands',
    '',
    `Mention \`${botMention}\` in a PR comment followed by a command.`,
    '',
    '| Command | What it does |',
    '| --- | --- |',
    `| \`${botMention} apply-and-merge\` | Runs \`terragrunt apply\` on every `
      + 'changed stack, then enables squash auto-merge once all stacks apply '
      + 'cleanly. Requires write access, any approvals required by branch '
      + 'protection or CODEOWNERS, no merge conflicts, and a non-draft PR. |',
    `| \`${botMention} unlock\` | Force-releases stuck Terraform state locks `
      + 'for the stacks changed by this PR. Requires write access. Use only '
      + 'when a previous run left a lock behind. |',
    `| \`${botMention} help\` | Posts this help comment. |`,
    '',
    '### How it works',
    '',
    '- Each changed stack is locked to this PR while it applies, so two PRs '
      + 'cannot apply the same stack at the same time.',
    `- The \`${statusCheckName}\` check stays pending until `
      + `\`${botMention} apply-and-merge\` succeeds. A PR that changes no `
      + 'Terraform stacks passes it automatically.',
    '- If an apply fails, fix the issue, push, and run '
      + `\`${botMention} apply-and-merge\` again.`,
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
      ? `Stacks changed — run ${botMention} apply-and-merge to unblock merge`
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
      `${quoteTrigger()}Apply succeeded for \`${pr.headSha.slice(0, 7)}\` — [workflow run](${url})`,
      '',
      mergeStatus,
    ].join('\n');

    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body,
    });

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
      `${quoteTrigger()}Apply failed for \`${pr.headSha.slice(0, 7)}\` — [workflow run](${url})`,
      '',
      `One or more stacks did not apply cleanly. Fix the issue and run \`${botMention} apply-and-merge\` again.`,
    ].join('\n');

    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body,
    });

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

// quoteTrigger renders the triggering comment as a blockquote so the bot's
// reply clearly attributes the request to the original commenter rather than
// looking like an edit of their comment. Returns an empty string for
// non-comment events (e.g. the scheduled apply-all path) where there is no
// comment to quote.
function quoteTrigger(): string {
  const commenter = context.payload.comment?.user?.login;
  const commentBody = context.payload.comment?.body?.trim();
  if (!commenter || !commentBody) {
    return '';
  }
  const quoted = commentBody
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `> @${commenter} commented:\n>\n${quoted}\n\n`;
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
    body: `${quoteTrigger()}\`${botMention} ${command}\` requires write access.`,
  });
  return false;
}

interface ReviewDecisionResult {
  repository: {
    pullRequest: {
      reviewDecision: string | null;
      baseRefOid: string;
      headRefOid: string;
      baseRef: {
        branchProtectionRule: {
          requiresCodeOwnerReviews: boolean;
        } | null;
      } | null;
      reviewRequests: {
        nodes: Array<{
          requestedReviewer:
          | { __typename: 'User'; login: string }
          | { __typename: 'Team'; combinedSlug: string }
          | null;
        }>;
      };
      latestOpinionatedReviews: {
        nodes: Array<{
          state: string;
          author: { login: string } | null;
        }>;
      };
    };
  };
}

function reviewerHandle(
  reviewer: ReviewDecisionResult['repository']['pullRequest']['reviewRequests']['nodes'][number]['requestedReviewer'],
): string | null {
  if (!reviewer) {
    return null;
  }
  if (reviewer.__typename === 'User') {
    return `@${reviewer.login}`;
  }
  return `@${reviewer.combinedSlug}`;
}

export type ReviewGateRoute = 'allow' | 'block-changes' | 'block-review' | 'codeowners';

export function reviewGateRoute(
  reviewDecision: string | null,
  requiresCodeOwnerReviews: boolean,
): ReviewGateRoute {
  if (reviewDecision === 'APPROVED') {
    return 'allow';
  }
  if (reviewDecision === 'CHANGES_REQUESTED') {
    return 'block-changes';
  }
  if (reviewDecision === 'REVIEW_REQUIRED') {
    return 'block-review';
  }
  if (requiresCodeOwnerReviews) {
    return 'codeowners';
  }
  return 'allow';
}

export const defaultCodeownersPaths = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
];

export function codeownersPathsToTry(configured: string): string[] {
  const trimmed = configured.trim();
  if (trimmed) {
    return [trimmed];
  }
  return defaultCodeownersPaths;
}

export async function evaluateCodeownersCoverage(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  baseSha: string,
  headSha: string,
  codeownersPath = '',
): Promise<{ passed: boolean; uncoveredPaths: string[]; totalOwnedFiles: number }> {
  const paths = codeownersPathsToTry(codeownersPath);
  let codeownersText: string | null = null;
  let resolvedPath = '';

  for (const path of paths) {
    try {
      codeownersText = await readCodeownersAtBase(octokit, owner, repo, path, baseSha);
      resolvedPath = path;
      break;
    } catch (error: unknown) {
      const { status } = error as { status?: number };
      if (status === 404) {
        continue;
      }
      throw error;
    }
  }

  if (codeownersText === null) {
    core.info(
      `No CODEOWNERS found at ${paths.join(', ')} on the base ref — nothing to enforce`,
    );
    return { passed: true, uncoveredPaths: [], totalOwnedFiles: 0 };
  }

  core.info(`Evaluating CODEOWNERS from ${resolvedPath}`);

  const changedFiles = await listChangedFiles(octokit, owner, repo, prNumber);
  const ownedFiles = matchOwnedFiles(
    changedFiles.map((file) => file.filename),
    parseCodeowners(codeownersText),
  );

  if (ownedFiles.length === 0) {
    core.info('No changed files matched a CODEOWNERS rule with owners');
    return { passed: true, uncoveredPaths: [], totalOwnedFiles: 0 };
  }

  const expander = new TeamExpander(octokit);
  const files: FileOwnership[] = await Promise.all(
    ownedFiles.map(async (owned) => ({
      path: owned.path,
      pattern: owned.pattern,
      ownerTokens: owned.owners,
      ownerLogins: await expander.expandOwners(owned.owners, owner),
    })),
  );

  const approvers = await getApprovers(octokit, owner, repo, prNumber, {
    dismissStale: false,
    headSha,
  });
  const decision = decide({ author: '', approvers, files });
  return {
    passed: decision.passed,
    uncoveredPaths: decision.uncovered.map((file) => file.path),
    totalOwnedFiles: decision.totalOwnedFiles,
  };
}

async function requireReviewDecision(
  octokit: Octokit,
  prNumber: number,
  codeownersPath: string,
): Promise<boolean> {
  const { repository } = await octokit.graphql<ReviewDecisionResult>(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviewDecision
          baseRefOid
          headRefOid
          baseRef {
            branchProtectionRule {
              requiresCodeOwnerReviews
            }
          }
          reviewRequests(first: 20) {
            nodes {
              requestedReviewer {
                __typename
                ... on User { login }
                ... on Team { combinedSlug }
              }
            }
          }
          latestOpinionatedReviews(first: 20) {
            nodes {
              state
              author { login }
            }
          }
        }
      }
    }
  `, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: prNumber,
  });

  const {
    reviewDecision,
    reviewRequests,
    latestOpinionatedReviews,
    baseRefOid,
    headRefOid,
    baseRef,
  } = repository.pullRequest;

  const requiresCodeOwnerReviews = baseRef?.branchProtectionRule?.requiresCodeOwnerReviews
    ?? false;
  const route = reviewGateRoute(reviewDecision, requiresCodeOwnerReviews);

  if (route === 'allow') {
    return true;
  }

  if (route === 'block-changes') {
    const authors = latestOpinionatedReviews.nodes
      .filter((r) => r.state === 'CHANGES_REQUESTED' && r.author)
      .map((r) => `@${r.author!.login}`);
    let body = `${quoteTrigger()}\`${botMention} apply-and-merge\` is blocked while a review requests changes.`;
    if (authors.length > 0) {
      body += ` Requested by: ${authors.join(', ')}.`;
    }
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body,
    });
    return false;
  }

  if (route === 'block-review') {
    const reviewers = reviewRequests.nodes
      .map((n) => reviewerHandle(n.requestedReviewer))
      .filter((h): h is string => h !== null);
    let body = `${quoteTrigger()}\`${botMention} apply-and-merge\` needs an approval before it can run.`;
    if (reviewers.length > 0) {
      body += ` Waiting on: ${reviewers.join(', ')}.`;
    }
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body,
    });
    return false;
  }

  const coverage = await evaluateCodeownersCoverage(
    octokit,
    context.repo.owner,
    context.repo.repo,
    prNumber,
    baseRefOid,
    headRefOid,
    codeownersPath,
  );

  if (coverage.passed) {
    return true;
  }

  const paths = coverage.uncoveredPaths.map((path) => `\`${path}\``).join(', ');
  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `${quoteTrigger()}\`${botMention} apply-and-merge\` needs a code-owner approval before it can run. Uncovered file(s): ${paths}.`,
  });
  return false;
}

export async function validateApply(
  octokit: Octokit,
  codeownersPath = '',
): Promise<boolean> {
  const ctx = issueCommentContext();
  if (!ctx) {
    return false;
  }
  const { commenter, prNumber } = ctx;

  if (!(await requireWriteAccess(octokit, commenter, prNumber, 'apply-and-merge'))) {
    return false;
  }

  if (!(await requireReviewDecision(octokit, prNumber, codeownersPath))) {
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
      body: `${quoteTrigger()}Cannot apply — the pull request is still a draft. Mark it as ready for review and try again.`,
    });
    return false;
  }
  if (pr.mergeable_state === 'dirty' || pr.mergeable === false) {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: `${quoteTrigger()}Cannot apply — the branch has conflicts with the base branch. Resolve them and try again.`,
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
    body: `${quoteTrigger()}Applying \`${headSha}\` — [workflow run](${runUrl()})`,
  });

  core.info(`Accepted apply-and-merge from ${commenter}`);
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

  const commentId = context.payload.comment?.id;
  if (commentId) {
    await octokit.rest.reactions.createForIssueComment({
      ...context.repo,
      comment_id: commentId,
      content: '+1',
    });
  }

  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `${quoteTrigger()}Releasing Terraform state locks for the changed stacks — [workflow run](${runUrl()})`,
  });

  core.info(`Accepted unlock from ${commenter}`);
  return true;
}

async function postUnknownCommandComment(
  octokit: Octokit,
  prNumber: number,
  requested: string | null,
): Promise<void> {
  const lines = [
    requested
      ? `${quoteTrigger()}Unknown command \`${botMention} ${requested}\`.`
      : `${quoteTrigger()}No command found after \`${botMention}\`.`,
    '',
    'Available commands:',
    '',
    ...commands.map((c) => `- \`${botMention} ${c.name}\` — ${c.summary}`),
    '',
    `Comment \`${botMention} help\` for full details.`,
  ];
  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: lines.join('\n'),
  });
}

// dispatch parses a PR comment that mentions the bot, routes it to the matching
// command, and returns the resolved command name plus whether the engine should
// proceed. Unknown or missing subcommands post a helper comment and resolve to
// "unknown" (ok), so the caller workflow runs nothing. A recognized command
// that fails validation resolves ok=false so the caller can gate downstream
// jobs on this job failing.
export async function dispatch(
  octokit: Octokit,
  statusCheckName: string,
  codeownersPath = '',
): Promise<{ command: string; ok: boolean }> {
  const body = context.payload.comment?.body ?? '';
  const prNumber = context.payload.issue?.number;
  const parsed = parseComment(body);

  if (!parsed.mentioned) {
    core.info(`Comment does not mention ${botMention} — nothing to do`);
    return { command: 'none', ok: true };
  }

  if (!prNumber) {
    core.warning('Comment is not on a pull request — ignoring');
    return { command: 'none', ok: true };
  }

  switch (parsed.command) {
    case 'help': {
      await upsertHelpComment(octokit, prNumber, statusCheckName);
      return { command: 'help', ok: true };
    }
    case 'apply-and-merge': {
      const ok = await validateApply(octokit, codeownersPath);
      return { command: 'apply-and-merge', ok };
    }
    case 'unlock': {
      const ok = await validateUnlock(octokit);
      return { command: 'unlock', ok };
    }
    default: {
      await postUnknownCommandComment(octokit, prNumber, parsed.command);
      return { command: 'unknown', ok: true };
    }
  }
}
