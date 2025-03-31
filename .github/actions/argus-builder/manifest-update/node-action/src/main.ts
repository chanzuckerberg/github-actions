import * as core from '@actions/core';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';
// eslint-disable-next-line import/no-relative-packages
import { getCommaDelimitedArrayInput, ProcessedImage } from '../../../common';

type Inputs = {
  shouldDeploy: boolean
  images: ProcessedImage[]
  imageTag: string
  buildResults: string[]
  envs: string[]
};

export function getInputs(): Promise<Inputs> {
  return core.group('Gather inputs', async () => {
    const inputs = {
      shouldDeploy: core.getBooleanInput('should_deploy', { required: true }),
      images: JSON.parse(core.getInput('images', { required: true })),
      imageTag: core.getInput('image_tag', { required: true }),
      buildResults: getCommaDelimitedArrayInput('build_results', { required: true }),
      envs: getCommaDelimitedArrayInput('envs', { required: true }),
    };

    core.info(`Received inputs: ${JSON.stringify(inputs, null, 2)}`);

    return inputs;
  });
}

if (process.env.NODE_ENV !== 'test') {
  main();
}

export async function main() {
  const inputs = await getInputs();

  if (!inputs.shouldDeploy) {
    core.info('> Skipping manifest update because should_deploy is false');
    return;
  }

  if (!inputs.buildResults.every((result) => result === 'success')) {
    const err = new Error('We won\'t update the manifest because one or more Docker builds did not succeed');
    core.error(err);
    throw err;
  }
  core.info('> All builds passed, continuing with manifest update...');

  const valuesFilesToUpdate = await core.group(
    'Determine values.yaml files to update',
    async () => determineValuesFilesToUpdate(inputs.images, inputs.envs),
  );
  await core.group('Update values.yaml files', async () => updateValuesFiles(valuesFilesToUpdate, inputs.imageTag));
  await core.group('Commit and push changes', async () => commitAndPushChanges(valuesFilesToUpdate, inputs));

  core.info('Values files updated successfully');
}

export function determineValuesFilesToUpdate(images: ProcessedImage[], envs: string[]): string[] {
  const argusInfraDirs = images.map((image) => {
    if (!image.should_build) {
      core.info(`Skipping manifest update for image ${image.name} because should_build is false`);
      return '';
    }

    const argusRootDir = image.argus_root.trim();
    if (argusRootDir.length === 0) {
      core.info(`Skipping manifest update for image ${image.name} because argus_root is not set`);
      return '';
    }

    const infraDirPath = path.join(argusRootDir, '.infra');
    if (!fs.existsSync(infraDirPath)) {
      throw new Error(`.infra directory not found at ${infraDirPath}`);
    }
    return infraDirPath;
  }).filter((dir) => dir.length > 0);

  const uniqueArgusInfraDirs = [...new Set(argusInfraDirs)];
  core.info(`Argus infra dirs to update: [${uniqueArgusInfraDirs.join(',')}] for envs: [${envs.join(',')}]`);

  const files: string[] = [];
  uniqueArgusInfraDirs.forEach((infraDir) => {
    envs.forEach((env) => {
      const filePath = path.join(infraDir, env, 'values.yaml');
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      } else {
        core.info(`- Skipping ${filePath} because it does not exist`);
      }
    });
  });

  if (files.length === 0) {
    core.info('No values.yaml files found to update');
  } else {
    core.info(`Values files to update:\n - ${files.join('\n - ')}`);
  }

  return files;
}

export function updateValuesFiles(valuesFilesToUpdate: string[], imageTag: string): void {
  valuesFilesToUpdate.forEach((filePath) => {
    core.info(`Updating ${filePath} to use image tag ${imageTag}`);
    child_process.execFileSync(
      'yq',
      ['eval', '-i', `(.. | select(has("tag")) | select(.tag == "sha-*")).tag = "${imageTag}"`, filePath],
    );

    core.info(`Updated ${filePath}\n---`);
    core.info(fs.readFileSync(filePath).toString());
    core.info('---');
  });
}

export function commitAndPushChanges(valuesFilesToUpdate: string[], inputs: Inputs): void {
  child_process.execFileSync('git', ['add', ...valuesFilesToUpdate]);
  child_process.execSync('git status', { stdio: 'inherit' });
  try {
    child_process.execSync('git diff --staged --exit-code');
  } catch (error: any) {
    // If there are changes to commit, the "git diff --staged --exit-code" command will throw an error
    child_process.execFileSync(
      'git',
      ['commit', '-m', `"chore: Updated [${inputs.envs.join(',')}] values.yaml image tags to ${inputs.imageTag}"`],
    );

    core.info('Pushing changes to remote');
    child_process.execSync('git push', { stdio: 'inherit' });
  }
}
