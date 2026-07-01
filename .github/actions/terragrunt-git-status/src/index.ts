import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  gate, finalize, validateApply, validateUnlock,
} from './lib';

async function run(): Promise<void> {
  const operation = core.getInput('operation', { required: true });
  const stacksRaw = core.getInput('stacks', { required: true });
  const statusCheckName = core.getInput('status_check_name') || 'terragrunt-apply';

  let stacks: string[];
  try {
    stacks = JSON.parse(stacksRaw);
  } catch {
    throw new Error(`stacks input must be valid JSON array, got: ${stacksRaw}`);
  }

  const token = core.getInput('github_token', { required: true });
  const octokit = github.getOctokit(token);

  switch (operation) {
    case 'gate': {
      await gate(octokit, stacks, statusCheckName);
      break;
    }

    case 'finalize': {
      const runResult = core.getInput('run_result');
      if (!runResult) {
        throw new Error('run_result input is required for the finalize operation');
      }
      const allSucceeded = await finalize(octokit, stacks, statusCheckName, runResult);
      core.setOutput('all_succeeded', String(allSucceeded));
      break;
    }

    case 'validate-apply': {
      const approved = await validateApply(octokit);
      if (!approved) {
        core.setFailed('Validation rejected /apply-and-merge');
      }
      break;
    }

    case 'validate-unlock': {
      const approved = await validateUnlock(octokit);
      if (!approved) {
        core.setFailed('Validation rejected /unlock');
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}. Must be one of: gate, finalize, validate-apply, validate-unlock`);
  }
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
