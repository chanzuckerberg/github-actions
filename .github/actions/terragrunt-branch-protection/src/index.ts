import * as core from '@actions/core';
import * as github from '@actions/github';
import { ensureBranchProtection } from './lib';

async function run(): Promise<void> {
  const statusCheckName = core.getInput('status_check_name') || 'terragrunt-apply';
  const token = core.getInput('github_token', { required: true });
  const octokit = github.getOctokit(token);

  await ensureBranchProtection(octokit, statusCheckName);
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
