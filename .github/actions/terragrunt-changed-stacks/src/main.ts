import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line import/no-relative-packages
import { findChangedFiles } from '../../find-changed-files/src/findChangedFiles';
import {
  enumerateStacks,
  extractChangedModules,
  findDependentStacks,
  parseBases,
  stacksFromChangedFiles,
} from './lib';

function listDirEntries(dir: string): string[] | null {
  if (!fs.existsSync(dir)) {
    return null;
  }
  return fs.readdirSync(dir).filter((name) => {
    const fullPath = path.join(dir, name);
    return fs.statSync(fullPath).isDirectory();
  });
}

function listAllEntries(dir: string): string[] | null {
  if (!fs.existsSync(dir)) {
    return null;
  }
  return fs.readdirSync(dir);
}

function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function run(): Promise<void> {
  const bases = parseBases(core.getInput('stack_paths', { required: true }));
  const allStacks = core.getBooleanInput('all_stacks');
  const triggerPaths = parseBases(core.getInput('trigger_all_paths'));

  let stacks: string[];
  if (allStacks) {
    stacks = enumerateStacks(bases, listDirEntries);
  } else {
    const token = core.getInput('github_token', { required: true });
    const result = await findChangedFiles(token);

    const directStacks = stacksFromChangedFiles(result.allModifiedFiles, bases);
    const changedModules = extractChangedModules(result.allModifiedFiles, triggerPaths);

    if (changedModules.length > 0) {
      core.info(`Changed modules: ${changedModules.join(', ')}`);
      const allEnumerated = enumerateStacks(bases, listDirEntries);
      const dependent = findDependentStacks(allEnumerated, changedModules, listAllEntries, readFileContent);
      core.info(`Dependent stacks: ${JSON.stringify(dependent)}`);
      stacks = [...new Set([...directStacks, ...dependent])];
    } else {
      stacks = directStacks;
    }
  }

  core.info(`stacks: ${JSON.stringify(stacks)}`);
  core.setOutput('stacks', JSON.stringify(stacks));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
