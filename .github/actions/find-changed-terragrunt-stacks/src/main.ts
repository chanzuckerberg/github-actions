import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { findChangedFiles } from '../../find-changed-files/src/findChangedFiles';
import {
  enumerateStacks,
  parseBases,
  stacksFromChangedFiles,
} from './lib';

export async function run(): Promise<void> {
  const bases = parseBases(core.getInput('stack_paths', { required: true }));
  const allStacks = core.getBooleanInput('all_stacks');

  let stacks: string[];
  if (allStacks) {
    stacks = enumerateStacks(bases, (base) => {
      if (!fs.existsSync(base)) {
        return null;
      }
      return fs.readdirSync(base).filter((name) => {
        const fullPath = path.join(base, name);
        return fs.statSync(fullPath).isDirectory();
      });
    });
  } else {
    const token = core.getInput('github_token', { required: true });
    const result = await findChangedFiles(token);
    stacks = stacksFromChangedFiles(result.allModifiedFiles, bases);
  }

  core.info(`stacks: ${JSON.stringify(stacks)}`);
  core.setOutput('stacks', JSON.stringify(stacks));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
