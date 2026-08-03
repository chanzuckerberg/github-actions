import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { matchOwnedFiles, parseCodeowners } from './codeowners';
import { authorOwnsAll, decide } from './decide';
import {
  getApprovers, listChangedFiles, readCodeownersAtBase, TeamExpander,
} from './github';
import { Decision, FileOwnership } from './types';

/** Render a token, expanding teams inline as `@org/team -> [@a, @b]`. */
function describeOwner(token: string, expansions: Map<string, string[]>): string {
  const logins = expansions.get(token);
  if (token.includes('/') && logins) {
    const members = logins.length ? logins.map((l) => `@${l}`).join(', ') : '(no members)';
    return `${token} -> [${members}]`;
  }
  return token;
}

/**
 * Emit a debug-friendly report so a reviewer can immediately see which files
 * still need which owner's approval.
 */
function logDecision(
  decision: Decision,
  author: string,
  approvers: string[],
  expansions: Map<string, string[]>,
): void {
  core.info(`Author: @${author}`);
  core.info(
    `Approving code-owner candidates: ${approvers.length ? approvers.map((a) => `@${a}`).join(', ') : '(none)'}`,
  );
  core.info(
    decision.authorOwnsEverything
      ? 'Author owns every changed owned file (fast path).'
      : 'Author does not own every changed owned file; approvals required.',
  );

  if (decision.passed) return;

  core.startGroup(
    `CODEOWNERS coverage failures (${decision.uncovered.length} of ${decision.totalOwnedFiles} owned file(s))`,
  );
  decision.uncovered.forEach((file) => {
    core.info(`- ${file.path}`);
    core.info(`    matched rule: ${file.pattern}`);
    core.info(`    required owners: ${file.ownerTokens.map((t) => describeOwner(t, expansions)).join(', ')}`);
    core.info('    none of these authored or approved the PR');
  });
  core.endGroup();
}

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const orgToken = core.getInput('org-token', { required: true });
    // org and codeowners-path defaults come from action.yml (single source of truth).
    const org = core.getInput('org');
    const codeownersPath = core.getInput('codeowners-path');
    const dismissStale = core.getBooleanInput('dismiss_stale_approvals');

    const pr = context.payload.pull_request;
    if (!pr) {
      core.setFailed('This action must run on a pull_request or pull_request_review event.');
      return;
    }

    const { owner, repo } = context.repo;
    const pullNumber = pr.number;
    const author: string = pr.user.login;
    const baseSha: string = pr.base.sha;
    const headSha: string = pr.head.sha;

    const octokit = getOctokit(githubToken);
    const orgOctokit = getOctokit(orgToken);

    const codeownersText = await readCodeownersAtBase(octokit, owner, repo, codeownersPath, baseSha);
    const entries = parseCodeowners(codeownersText);
    const changedFiles = await listChangedFiles(octokit, owner, repo, pullNumber);
    const ownedFiles = matchOwnedFiles(changedFiles, entries);

    core.info(
      `${changedFiles.length} changed file(s); ${ownedFiles.length} matched a CODEOWNERS rule.`,
    );

    if (ownedFiles.length === 0) {
      core.info('No changed files are owned by CODEOWNERS; nothing to enforce.');
      return;
    }

    const expander = new TeamExpander(orgOctokit);
    const files: FileOwnership[] = await Promise.all(
      ownedFiles.map(async (owned) => ({
        path: owned.path,
        pattern: owned.pattern,
        ownerTokens: owned.owners,
        ownerLogins: await expander.expandOwners(owned.owners, org),
      })),
    );

    // Fast path: if the author owns every owned file we can pass without
    // fetching reviews at all.
    const approvers = authorOwnsAll(files, author)
      ? []
      : await getApprovers(octokit, owner, repo, pullNumber, { dismissStale, headSha });

    const decision = decide({ author, approvers, files });
    logDecision(decision, author, approvers, expander.expansions);

    if (decision.passed) {
      core.info(
        `CODEOWNERS approval check passed: all ${decision.totalOwnedFiles} owned file(s) are covered.`,
      );
    } else {
      core.setFailed(
        `CODEOWNERS approval check failed: ${decision.uncovered.length} of ${decision.totalOwnedFiles} `
        + 'owned file(s) lack an approving code owner. See the log group above for details.',
      );
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();

export { run };
