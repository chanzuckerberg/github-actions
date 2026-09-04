import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { matchOwnedFiles, parseCodeowners } from './codeowners';
import { authorOwnsAll, classifyFiles, decide } from './decide';
import { buildAnnotations, renderCheckOutput } from './checkOutput';
import {
  CheckConclusion, deletesCodeowners, getApprovers, listChangedFiles, readCodeownersAtBase,
  TeamExpander, upsertCheckRun,
} from './github';
import { CheckRunOutput, Decision, FileOwnership } from './types';

/** Link back to this workflow run, used as the Check Run's details URL. */
function runUrl(): string | undefined {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }
  return undefined;
}

/** Debug-friendly log of which files are still uncovered and by whom. */
function logDecision(decision: Decision, author: string, approvers: string[]): void {
  core.info(`Author: @${author}`);
  core.info(
    `Approving code-owner candidates: ${approvers.length ? approvers.map((a) => `@${a}`).join(', ') : '(none)'}`,
  );
  if (decision.passed) return;
  core.startGroup(
    `CODEOWNERS coverage failures (${decision.uncovered.length} of ${decision.totalOwnedFiles} owned file(s))`,
  );
  decision.uncovered.forEach((file) => {
    core.info(`- ${file.path} (rule ${file.pattern}) needs one of: ${file.ownerTokens.join(', ')}`);
  });
  core.endGroup();
}

async function run(): Promise<void> {
  const githubToken = core.getInput('github-token', { required: true });
  const orgToken = core.getInput('org-token', { required: true });
  // org, codeowners-path and check-name defaults come from action.yml.
  const org = core.getInput('org');
  const codeownersPath = core.getInput('codeowners-path');
  const checkName = core.getInput('check-name');
  const dismissStale = core.getBooleanInput('dismiss_stale_approvals');

  const pr = context.payload.pull_request;
  if (!pr) {
    // Can't create a check run without a PR head SHA, so just fail the job.
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

  const report = (
    conclusion: CheckConclusion,
    output: CheckRunOutput,
  ): Promise<void> => upsertCheckRun(octokit, owner, repo, headSha, checkName, conclusion, output, runUrl());

  try {
    // Independent reads: fetch CODEOWNERS (base ref) and the PR's changed files
    // in parallel. Reading CODEOWNERS at the base throws if it is absent there,
    // which is intentional -- a repo with no CODEOWNERS should fail loudly.
    const [codeownersText, changedFiles] = await Promise.all([
      readCodeownersAtBase(octokit, owner, repo, codeownersPath, baseSha),
      listChangedFiles(octokit, owner, repo, pullNumber),
    ]);

    // Fail if this PR deletes or moves CODEOWNERS. Because we evaluate the file
    // from the base ref, such a deletion would otherwise pass and silently
    // disable ownership enforcement going forward.
    if (deletesCodeowners(changedFiles, codeownersPath)) {
      const title = `This PR removes or moves ${codeownersPath}`;
      core.warning(title);
      await report('failure', {
        title,
        summary: `${title}. CODEOWNERS is evaluated at the base ref, so removing it would disable ownership enforcement.`,
      });
      return;
    }

    const entries = parseCodeowners(codeownersText);
    const ownedFiles = matchOwnedFiles(changedFiles.map((file) => file.filename), entries);

    core.info(
      `${changedFiles.length} changed file(s); ${ownedFiles.length} matched a CODEOWNERS rule.`,
    );

    // Always report (even when nothing is owned), otherwise a required check
    // would never appear and would block the PR forever.
    if (ownedFiles.length === 0) {
      await report('success', {
        title: 'No changed files are owned by CODEOWNERS',
        summary: 'No changed files match a CODEOWNERS rule; nothing to enforce.',
      });
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

    // Fast path: if the author owns every owned file we can pass without the
    // extra reviews API call. `decide` recomputes this to set
    // `authorOwnsEverything`, but that is an O(files) in-memory pass with no
    // I/O -- kept separate so `decide` stays pure and self-contained for tests,
    // while this call gates the network fetch.
    const approvers = authorOwnsAll(files, author)
      ? []
      : await getApprovers(octokit, owner, repo, pullNumber, { dismissStale, headSha });

    const decision = decide({ author, approvers, files });
    logDecision(decision, author, approvers);

    // Build the human-facing output (grouped "waiting on" + per-file table) and
    // inline annotations on the files still needing approval.
    const verdicts = classifyFiles({ author, approvers, files });
    const rendered = renderCheckOutput(verdicts, expander.expansions);
    const conclusion: CheckConclusion = decision.passed ? 'success' : 'failure';
    await report(conclusion, {
      ...rendered,
      annotations: decision.passed ? undefined : buildAnnotations(verdicts),
    });

    core.info(
      `CODEOWNERS approval check: ${conclusion} (${decision.uncovered.length} of ${decision.totalOwnedFiles} uncovered).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A genuine error should be visible and block merge: post a failing check
    // AND fail the job (a red run here is desirable for debugging).
    try {
      await report('failure', {
        title: 'CODEOWNERS approval check error',
        summary: `Action error: ${message}`,
      });
    } catch (reportError) {
      const reportMessage = reportError instanceof Error ? reportError.message : String(reportError);
      core.warning(`Failed to report check run: ${reportMessage}`);
    }
    core.setFailed(`Action failed: ${message}`);
  }
}

run();

export { run };
