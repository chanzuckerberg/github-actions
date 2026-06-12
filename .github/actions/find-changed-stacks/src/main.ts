import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import {
  enumerateStacks,
  parseBases,
  stacksFromChangedFiles,
} from './lib';

async function changedFiles(token: string): Promise<string[]> {
  const octokit = github.getOctokit(token);
  const { context } = github;
  const { owner, repo } = context.repo;

  if (context.eventName === 'pull_request') {
    const pullNumber = context.payload.pull_request?.number;
    if (!pullNumber) {
      return [];
    }
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    return files.map((f) => f.filename);
  }

  if (context.eventName === 'push') {
    const before = context.payload.before as string | undefined;
    const after = context.payload.after as string | undefined;
    // No base to diff against (e.g. branch creation): treat as no changes.
    if (!before || !after || /^0+$/.test(before)) {
      return [];
    }
    const res = await octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${before}...${after}`,
    });
    return (res.data.files ?? []).map((f) => f.filename);
  }

  core.warning(`Unsupported event "${context.eventName}"; treating as no changes`);
  return [];
}

export async function run(): Promise<void> {
  const bases = parseBases(core.getInput('stack_paths', { required: true }));
  const allStacks = core.getBooleanInput('all_stacks');

  let stacks: string[];
  if (allStacks) {
    stacks = enumerateStacks(bases, (base) => (fs.existsSync(base) ? fs.readdirSync(base) : null));
  } else {
    const token = core.getInput('github_token', { required: true });
    const files = await changedFiles(token);
    stacks = stacksFromChangedFiles(files, bases);
  }

  core.info(`stacks: ${JSON.stringify(stacks)}`);
  core.setOutput('stacks', JSON.stringify(stacks));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
