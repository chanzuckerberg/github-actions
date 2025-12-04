import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

type Output = {
  allModifiedFiles: string[]
};

export async function findChangedFiles(githubToken: string, sinceCommitSha: string = ''): Promise<Output> {
  const gitClient = github.getOctokit(githubToken);

  const { owner, repo } = github.context.repo;

  if (github.context.eventName === 'pull_request') {
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error('No pull request number found');
    }

    const changedFilePaths = await getChangedFilesInPRSinceCommit(gitClient, repo, owner, prNumber, sinceCommitSha);
    core.info(`Triggered by pull_request event, found changed files in PR: ${JSON.stringify(changedFilePaths, null, 2)}`);
    return { allModifiedFiles: changedFilePaths };
  } if (github.context.eventName === 'push') {
    core.debug(`Push event detected ${JSON.stringify(github.context.payload, null, 2)}`);
    const commitSha = github.context.sha;

    const isForcedPush = github.context.payload.forced || false;
    if (isForcedPush) {
      const result = await gitClient.rest.repos.listPullRequestsAssociatedWithCommit({
        owner,
        repo,
        commit_sha: commitSha,
      });

      const openPRs = result.data.filter((pr) => pr.state === 'open');
      if (openPRs.length === 0) {
        return { allModifiedFiles: [] };
      }

      const pr = openPRs[0];
      const changedFilePaths = await getChangedFilesInPR(gitClient, repo, owner, pr.number);
      core.info(`Triggered by push (force=true), found changed files in PR: ${JSON.stringify(changedFilePaths, null, 2)}`);
      return { allModifiedFiles: changedFilePaths };
    }

    const commitResp = await gitClient.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    const changedFilePaths = (commitResp.data.files || []).map((file) => file.filename);
    core.info(`Triggered by push (force=false), found changed files in commit: ${JSON.stringify(changedFilePaths, null, 2)}`);
    return { allModifiedFiles: changedFilePaths };
  }
  throw new Error(`EventName ${github.context.eventName} not supported`);
}

async function getChangedFilesInPR(
  gitClient: InstanceType<typeof GitHub>,
  repo: string,
  owner: string,
  prNumber: number,
): Promise<string[]> {
  let page = 1;
  const allFiles: string[] = [];
  while (true) {
    const listFilesResp = await gitClient.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
      page,
    });
    if (listFilesResp.data.length === 0) {
      break;
    }
    allFiles.push(...listFilesResp.data.map((file) => file.filename));
    page += 1;
  }

  return allFiles;
}

/**
 * Gets a list of files changed in a PR since a particular commit SHA.
 * If the commit SHA is not in the branch of the PR, returns all files changed in the PR.
 *
 * @param gitClient - GitHub Octokit client instance
 * @param repo - Repository name
 * @param owner - Repository owner
 * @param prNumber - Pull request number
 * @param sinceCommitSha - Commit SHA to compare from
 * @returns Array of file paths that have changed
 */
export async function getChangedFilesInPRSinceCommit(
  gitClient: InstanceType<typeof GitHub>,
  repo: string,
  owner: string,
  prNumber: number,
  sinceCommitSha: string,
): Promise<string[]> {
  // Get PR details to get the head SHA
  const prDetails = await gitClient.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const headSha = prDetails.data.head.sha;

  // Check if the sinceCommitSha is in the PR's branch by getting all commits
  const isCommitInBranch = await checkIfCommitInPR(gitClient, owner, repo, prNumber, sinceCommitSha);

  if (!isCommitInBranch) {
    core.info(`Commit ${sinceCommitSha} not found in PR #${prNumber}, returning all changed files in PR`);
    return getChangedFilesInPR(gitClient, repo, owner, prNumber);
  }

  core.info(`Commit ${sinceCommitSha} found in PR #${prNumber}, getting files changed since that commit`);

  // Get files changed between sinceCommitSha and head of PR
  try {
    let page = 1;
    const allFiles: string[] = [];

    while (true) {
      const comparison = await gitClient.rest.repos.compareCommits({
        owner,
        repo,
        base: sinceCommitSha,
        head: headSha,
        per_page: 100,
        page,
      });

      if (!comparison.data.files || comparison.data.files.length === 0) {
        break;
      }

      allFiles.push(...comparison.data.files.map((file) => file.filename));

      // Check if there are more pages
      if (comparison.data.files.length < 100) {
        break;
      }
      page += 1;
    }

    return allFiles;
  } catch (error) {
    core.warning(`Error comparing commits, falling back to all PR files: ${error}`);
    return getChangedFilesInPR(gitClient, repo, owner, prNumber);
  }
}

/**
 * Checks if a commit SHA exists in a PR's branch history
 *
 * @param gitClient - GitHub Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - Pull request number
 * @param commitSha - Commit SHA to look for
 * @returns True if the commit is in the PR's branch, false otherwise
 */
async function checkIfCommitInPR(
  gitClient: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNumber: number,
  commitSha: string,
): Promise<boolean> {
  try {
    let page = 1;

    while (true) {
      const commits = await gitClient.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
        page,
      });

      if (commits.data.length === 0) {
        break;
      }

      // Check if our target commit is in this page of results
      const found = commits.data.some((commit) => commit.sha === commitSha);
      if (found) {
        return true;
      }

      // If we got fewer results than requested, we're at the end
      if (commits.data.length < 100) {
        break;
      }

      page += 1;
    }

    return false;
  } catch (error) {
    core.warning(`Error checking if commit ${commitSha} is in PR: ${error}`);
    return false;
  }
}
