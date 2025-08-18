import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

type Output = {
  allModifiedFiles: string[]
};

export async function findChangedFiles(githubToken: string): Promise<Output> {
  const gitClient = github.getOctokit(githubToken);

  const { owner, repo } = github.context.repo;

  if (github.context.eventName === 'pull_request') {
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error('No pull request number found');
    }
    const changedFilePaths = await getChangedFilesInPR(gitClient, repo, owner, prNumber);
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
