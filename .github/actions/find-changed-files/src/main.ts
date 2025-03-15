import * as core from '@actions/core';
import * as github from '@actions/github';

type Inputs = {
  githubToken: string
};

export function getInputs(): Inputs {
  return {
    githubToken: core.getInput('github_token', { required: true }),
  };
}

export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

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
    core.setOutput('all_modified_files', changedFilePaths.join(','));

  } else if (github.context.eventName === 'push') {
    const commitSha = github.context.sha;
    const commitResp = await gitClient.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    const changedFilePaths = (commitResp.data.files || []).map((file) => file.filename);
    core.info(`Changed files in commit: ${JSON.stringify(changedFilePaths, null, 2)}`);
    core.setOutput('all_modified_files', changedFilePaths.join(','));

  } else {
    throw new Error(`EventName ${github.context.eventName} not supported`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
