import * as core from '@actions/core';
import * as github from '@actions/github';

type Inputs = {
  githubToken: string
};

type Output = {
  allModifiedFiles: string[]
};

export function getInputs(): Inputs {
  return {
    githubToken: core.getInput('github_token', { required: true }),
  };
}

export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  const res = await findChangedFiles(inputs);

  core.info(`Result: ${JSON.stringify(res, null, 2)}`);
  core.setOutput('all_modified_files', res.allModifiedFiles.join(','));
}

export async function findChangedFiles(inputs: Inputs): Promise<Output> {
  const gitClient = github.getOctokit(inputs.githubToken);

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
    console.log('Push event detected', JSON.stringify(github.context.payload, null, 2));
    const commitSha = github.context.sha;

    const isForcedPush = github.context.payload.forced || false;
    if (isForcedPush) {
      const result = await gitClient.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        commit_sha: commitSha,
      });

      const openPRs = result.data.filter(pr => pr.state === 'open');
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

if (process.env.NODE_ENV !== 'test') {
  main();
}
