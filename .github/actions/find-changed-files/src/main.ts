import * as core from '@actions/core';
import { findChangedFiles } from './findChangedFiles';

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

  const res = await findChangedFiles(inputs.githubToken);

  core.info(`Result: ${JSON.stringify(res, null, 2)}`);
  core.setOutput('all_modified_files', res.allModifiedFiles.join(','));
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
