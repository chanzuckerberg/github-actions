import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { matchOwnedFiles, parseCodeowners } from './codeowners';
import { authorOwnsAll, classifyFiles, decide } from './decide';
import { renderSummaryMarkdown, shortDescription } from './summary';
import {
  deletesCodeowners, getApprovers, listChangedFiles, readCodeownersAtBase, TeamExpander,
} from './github';
import { Decision, FileOwnership, FileVerdict } from './types';

type Octokit = ReturnType<typeof getOctokit>;
type StatusState = 'success' | 'failure' | 'error';

/** Link back to this workflow run; the commit status' Details points here. */
function runUrl(): string | undefined {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }
  return undefined;
}

/**
 * Report the verdict as a commit status on the PR head SHA.
 *
 * A commit status (unlike a job's check run) is keyed by (sha, context), so
 * every run -- pull_request or pull_request_review -- updates the SAME row
 * instead of adding a new one, collapsing the check to a single latest-wins
 * entry with a clean, stable name. The description is truncated at 140 chars;
 * the full breakdown lives in the job summary reachable via Details.
 */
async function setStatus(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
  statusContext: string,
  state: StatusState,
  description: string,
): Promise<void> {
  await octokit.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    context: statusContext,
    state,
    description: description.slice(0, 140),
    target_url: runUrl(),
  });
}

/**
 * Write the full "waiting on" + per-file breakdown to the Actions job summary
 * (best-effort). This is what a reviewer sees when they click the commit
 * status' Details link.
 */
async function writeJobSummary(verdicts: FileVerdict[], expansions: Map<string, string[]>): Promise<void> {
  try {
    core.summary.addRaw(renderSummaryMarkdown(verdicts, expansions), true);
    await core.summary.write();
  } catch (error) {
    core.warning(`Failed to write job summary: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  // org, codeowners-path and status-context defaults come from action.yml.
  const org = core.getInput('org');
  const codeownersPath = core.getInput('codeowners-path');
  const statusContext = core.getInput('status-context');
  const dismissStale = core.getBooleanInput('dismiss_stale_approvals');

  const pr = context.payload.pull_request;
  if (!pr) {
    // Can't post a commit status without a PR head SHA, so just fail the job.
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
      const description = `This PR removes or moves ${codeownersPath}`;
      core.warning(description);
      await setStatus(octokit, owner, repo, headSha, statusContext, 'failure', description);
      return;
    }

    const entries = parseCodeowners(codeownersText);
    const ownedFiles = matchOwnedFiles(changedFiles.map((file) => file.filename), entries);

    core.info(
      `${changedFiles.length} changed file(s); ${ownedFiles.length} matched a CODEOWNERS rule.`,
    );

    // Always post a status (even when nothing is owned), otherwise a required
    // status context would never appear and would block the PR forever.
    if (ownedFiles.length === 0) {
      await setStatus(octokit, owner, repo, headSha, statusContext, 'success', 'No changed files are owned by CODEOWNERS');
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

    // Full breakdown -> job summary; compact "waiting on" -> status description.
    const verdicts = classifyFiles({ author, approvers, files });
    await writeJobSummary(verdicts, expander.expansions);

    const state: StatusState = decision.passed ? 'success' : 'failure';
    await setStatus(octokit, owner, repo, headSha, statusContext, state, shortDescription(verdicts));

    core.info(
      `CODEOWNERS approval check: ${state} (${decision.uncovered.length} of ${decision.totalOwnedFiles} uncovered).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A genuine error should be visible and block merge: post an error status
    // AND fail the job (a red run here is desirable for debugging).
    try {
      await setStatus(octokit, owner, repo, headSha, statusContext, 'error', `Action error: ${message}`);
    } catch (statusError) {
      const statusMessage = statusError instanceof Error ? statusError.message : String(statusError);
      core.warning(`Failed to set commit status: ${statusMessage}`);
    }
    core.setFailed(`Action failed: ${message}`);
  }
}

run();

export { run };
