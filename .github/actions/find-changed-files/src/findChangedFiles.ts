import * as core from '@actions/core';
import * as github from '@actions/github';

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
    const listFilesResp = await gitClient.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    const changedFilePaths = listFilesResp.data.map((file) => file.filename);
    core.info(`Changed files in PR: ${JSON.stringify(changedFilePaths, null, 2)}`);
    return { allModifiedFiles: changedFilePaths };
  } if (github.context.eventName === 'push') {
    core.info(`Push event detected ${JSON.stringify(github.context.payload, null, 2)}`);
    const commitSha = github.context.sha;

    const isForcedPush = github.context.payload.forced || false;
    if (isForcedPush) {
      const result = await gitClient.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        commit_sha: commitSha,
      });

      const openPRs = result.data.filter((pr) => pr.state === 'open');
      if (openPRs.length === 0) {
        return { allModifiedFiles: [] };
      }

      const pr = openPRs[0];
      const listFilesResp = await gitClient.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
      });

      const changedFilePaths = listFilesResp.data.map((file) => file.filename);
      core.info(`Force push detected, checking all files in PR: ${JSON.stringify(changedFilePaths, null, 2)}`);
      return { allModifiedFiles: changedFilePaths };
    }

    const commitResp = await gitClient.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    const changedFilePaths = (commitResp.data.files || []).map((file) => file.filename);
    core.info(`Changed files in commit: ${JSON.stringify(changedFilePaths, null, 2)}`);
    return { allModifiedFiles: changedFilePaths };
  }
  throw new Error(`EventName ${github.context.eventName} not supported`);
}
