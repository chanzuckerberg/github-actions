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
      + 'changed stack, then squash-merges the pull request once all stacks '
      + 'apply cleanly. Requires write access, any approvals required by branch '
      + 'protection or CODEOWNERS, no merge conflicts, a branch that is up to '
      + 'date with the base branch, and a non-draft PR. |',
    `| \`${botMention} unlock\` | Force-releases stuck Terraform state locks `
      + 'for the stacks changed by this PR. Requires write access. Use only '
      + 'when a previous run left a lock behind. |',
    `| \`${botMention} help\` | Posts this help comment. |`,
    '',
    '### How it works',
    '',
    '- Each changed stack is locked to this PR while it applies, so two PRs '
      + 'cannot apply the same stack at the same time. Those locks are '
      + 'released when the PR is closed or merged.',
    `- The \`${statusCheckName}\` check stays pending until `
      + `\`${botMention} apply-and-merge\` succeeds. A PR that changes no `
      + 'Terraform stacks passes it automatically.',
    '- If an apply fails, fix the issue, push, and run '
      + `\`${botMention} apply-and-merge\` again.`,
    '- A branch that is behind the base branch cannot apply. Applying a stale '
      + 'branch reverts infrastructure that a newer commit on the base branch '
      + 'already applied, so update the branch first.',
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

export type AutoMergeRefusal = 'already-mergeable' | 'not-allowed' | 'other';

// classifyAutoMergeError sorts the GraphQL rejection from
// enablePullRequestAutoMerge. GitHub only accepts auto-merge on a pull request
// that cannot be merged yet, and reports "clean status" or "unstable status"
// when nothing is left to wait for. Neither phrase says so, and the difference
// decides whether the engine can just merge instead.
export function classifyAutoMergeError(message: string): AutoMergeRefusal {
  if (/is in (clean|unstable) status/i.test(message)) {
    return 'already-mergeable';
  }
  if (/auto[- ]?merge is not allowed/i.test(message)) {
    return 'not-allowed';
  }
  return 'other';
}

export function autoMergeRefusalMessage(
  refusal: AutoMergeRefusal,
  raw: string,
): string {
  if (refusal === 'not-allowed') {
    return 'Not merged. This repository does not allow auto-merge, so the '
      + 'engine could not queue the merge. Enable "Allow auto-merge" in '
      + 'Settings, General, then merge this pull request by hand.';
  }
  return `Not merged. GitHub rejected the merge: ${raw}`;
}

export interface MergeOutcome {
  merged: boolean;
  // Plain-English result for the pull request comment.
  message: string;
  // Short form for the commit status description, which GitHub truncates.
  short: string;
}

// completeMerge lands the pull request now that every stack applied. Native
// auto-merge is preferred, so GitHub still waits for any other required check.
// When GitHub refuses because nothing is left to wait for, the engine merges
// directly: auto-merge would have merged immediately anyway, and stopping here
// would leave the apply done and the merge undone.
async function completeMerge(
  octokit: Octokit,
  prNumber: number,
  prNodeId: string,
): Promise<MergeOutcome> {
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
    `, { prId: prNodeId });
    return {
      merged: true,
      message: 'Auto-merge enabled.',
      short: 'Applied — auto-merge enabled',
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    const refusal = classifyAutoMergeError(raw);
    core.warning(`Auto-merge could not be enabled: ${raw}`);

    if (refusal !== 'already-mergeable') {
      return {
        merged: false,
        message: autoMergeRefusalMessage(refusal, raw),
        short: 'Applied — not merged (see PR comment)',
      };
    }

    return squashMerge(octokit, prNumber);
  }
}

async function squashMerge(
  octokit: Octokit,
  prNumber: number,
): Promise<MergeOutcome> {
  core.info('Nothing left for auto-merge to wait on — merging directly');
  try {
    await octokit.rest.pulls.merge({
      ...context.repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });
    return {
      merged: true,
      message: 'Merged. Nothing was left for auto-merge to wait on, so the '
        + 'engine squash-merged the pull request itself.',
      short: 'Applied — merged',
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    core.warning(`Direct merge failed: ${raw}`);
    return {
      merged: false,
      message: 'Not merged. The apply succeeded, but GitHub would neither queue '
        + `auto-merge nor accept a squash merge: ${raw}. Merge this pull request `
        + 'by hand.',
      short: 'Applied — not merged (see PR comment)',
    };
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
    const merge = await completeMerge(octokit, prNumber, pr.nodeId);

    const body = [
      `${quoteTrigger()}Apply succeeded for \`${pr.headSha.slice(0, 7)}\` — [workflow run](${url})`,
      '',
      merge.message,
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
      description: merge.short,
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

export function reviewGateRoute(reviewDecision: string | null): ReviewGateRoute {
  if (reviewDecision === 'APPROVED') {
    return 'allow';
  }
  if (reviewDecision === 'CHANGES_REQUESTED') {
    return 'block-changes';
  }
  if (reviewDecision === 'REVIEW_REQUIRED') {
    return 'block-review';
  }
  return 'codeowners';
}

const codeownersPath = '.github/CODEOWNERS';

export async function evaluateCodeownersCoverage(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  baseSha: string,
  headSha: string,
): Promise<{ passed: boolean; uncoveredPaths: string[]; totalOwnedFiles: number }> {
  let codeownersText: string;
  try {
    codeownersText = await readCodeownersAtBase(
      octokit,
      owner,
      repo,
      codeownersPath,
      baseSha,
    );
  } catch (error: unknown) {
    const { status } = error as { status?: number };
    if (status === 404) {
      core.info(`No ${codeownersPath} on the base ref — nothing to enforce`);
      return { passed: true, uncoveredPaths: [], totalOwnedFiles: 0 };
    }
    throw error;
  }

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
): Promise<boolean> {
  const { repository } = await octokit.graphql<ReviewDecisionResult>(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviewDecision
          baseRefOid
          headRefOid
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
  } = repository.pullRequest;

  const route = reviewGateRoute(reviewDecision);

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

export type MergeStateRoute =
  | 'allow'
  | 'block-conflict'
  | 'block-behind'
  | 'block-unknown';

// mergeStateRoute decides whether a PR's relationship to its base branch
// permits an apply. Conflicts outrank being behind, because a conflicted branch
// is also always behind and the conflict is the more useful thing to report.
export function mergeStateRoute(
  mergeable: boolean | null,
  mergeableState: string,
  behindBy: number,
): MergeStateRoute {
  if (mergeable === false || mergeableState === 'dirty') {
    return 'block-conflict';
  }
  if (behindBy > 0) {
    return 'block-behind';
  }
  if (mergeable === null) {
    return 'block-unknown';
  }
  return 'allow';
}

export function mergeStateMessage(
  route: MergeStateRoute,
  baseRef: string,
  behindBy: number,
): string {
  if (route === 'block-conflict') {
    return `Cannot apply — this branch conflicts with \`${baseRef}\`. `
      + 'Resolve the conflicts, push, and try again.';
  }
  if (route === 'block-behind') {
    const commits = behindBy === 1 ? '1 commit' : `${behindBy} commits`;
    return `Cannot apply — this branch is ${commits} behind \`${baseRef}\`. `
      + 'Applying a stale branch reverts infrastructure that a newer commit on '
      + `\`${baseRef}\` already applied. Update the branch with the Update `
      + `branch button, or merge \`${baseRef}\` in locally and push. Wait for `
      + `the plan to finish, then run \`${botMention} apply-and-merge\` again.`;
  }
  return 'Cannot apply — GitHub has not finished working out whether this '
    + 'branch merges cleanly. Try again in a moment.';
}

// GitHub computes mergeable asynchronously and reports null until it finishes,
// which is usually within a second or two of the last push.
const mergeabilityAttempts = 5;
const mergeabilityDelayMs = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchPrWithMergeability(octokit: Octokit, prNumber: number) {
  let pr;
  for (let attempt = 0; attempt < mergeabilityAttempts; attempt += 1) {
    if (attempt > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(mergeabilityDelayMs);
    }
    // eslint-disable-next-line no-await-in-loop
    const { data } = await octokit.rest.pulls.get({
      ...context.repo,
      pull_number: prNumber,
    });
    pr = data;
    if (pr.mergeable !== null) {
      return pr;
    }
    core.info('GitHub has not computed mergeability yet — retrying');
  }
  return pr!;
}

async function countCommitsBehindBase(
  octokit: Octokit,
  baseRef: string,
  headSha: string,
): Promise<number> {
  const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
    ...context.repo,
    basehead: `${baseRef}...${headSha}`,
  });
  return comparison.behind_by;
}

export interface ApplyValidation {
  ok: boolean;
  headSha: string;
  baseRef: string;
}

const rejected: ApplyValidation = { ok: false, headSha: '', baseRef: '' };

export async function validateApply(octokit: Octokit): Promise<ApplyValidation> {
  const ctx = issueCommentContext();
  if (!ctx) {
    return rejected;
  }
  const { commenter, prNumber } = ctx;

  if (!(await requireWriteAccess(octokit, commenter, prNumber, 'apply-and-merge'))) {
    return rejected;
  }

  if (!(await requireReviewDecision(octokit, prNumber))) {
    return rejected;
  }

  const pr = await fetchPrWithMergeability(octokit, prNumber);
  if (pr.draft) {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: `${quoteTrigger()}Cannot apply — the pull request is still a draft. Mark it as ready for review and try again.`,
    });
    return rejected;
  }

  const baseRef = pr.base.ref;
  const behindBy = await countCommitsBehindBase(octokit, baseRef, pr.head.sha);
  const route = mergeStateRoute(pr.mergeable, pr.mergeable_state, behindBy);
  if (route !== 'allow') {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: `${quoteTrigger()}${mergeStateMessage(route, baseRef, behindBy)}`,
    });
    return rejected;
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
  return { ok: true, headSha: pr.head.sha, baseRef };
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
export interface DispatchResult extends ApplyValidation {
  command: string;
}

export async function dispatch(
  octokit: Octokit,
  statusCheckName: string,
): Promise<DispatchResult> {
  const body = context.payload.comment?.body ?? '';
  const prNumber = context.payload.issue?.number;
  const parsed = parseComment(body);
  const noop = { ok: true, headSha: '', baseRef: '' };

  if (!parsed.mentioned) {
    core.info(`Comment does not mention ${botMention} — nothing to do`);
    return { command: 'none', ...noop };
  }

  if (!prNumber) {
    core.warning('Comment is not on a pull request — ignoring');
    return { command: 'none', ...noop };
  }

  switch (parsed.command) {
    case 'help': {
      await upsertHelpComment(octokit, prNumber, statusCheckName);
      return { command: 'help', ...noop };
    }
    case 'apply-and-merge': {
      const validation = await validateApply(octokit);
      return { command: 'apply-and-merge', ...validation };
    }
    case 'unlock': {
      const ok = await validateUnlock(octokit);
      return { command: 'unlock', ...noop, ok };
    }
    default: {
      await postUnknownCommandComment(octokit, prNumber, parsed.command);
      return { command: 'unknown', ...noop };
    }
  }
}
