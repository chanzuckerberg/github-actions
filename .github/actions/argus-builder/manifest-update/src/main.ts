import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';
// eslint-disable-next-line import/no-relative-packages
import { getCommaDelimitedArrayInput, ProcessedImage } from '../../common';

type Inputs = {
  shouldDeploy: boolean
  images: ProcessedImage[]
  imageTag: string
  buildResults: string[]
  envs: string[]
};

export function getInputs(): Inputs {
  return {
    shouldDeploy: core.getBooleanInput('should_deploy', { required: true }),
    images: JSON.parse(core.getInput('images', { required: true })),
    imageTag: core.getInput('image_tag', { required: true }),
    buildResults: getCommaDelimitedArrayInput('build_results', { required: true }),
    envs: getCommaDelimitedArrayInput('envs', { required: true }),
  };
}

if (process.env.NODE_ENV !== 'test') {
  main();
}

export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  if (!inputs.shouldDeploy) {
    core.info('Skipping manifest update because should_deploy is false');
    return;
  }

  if (!inputs.buildResults.every((result) => result === 'success')) {
    throw new Error('We won\'t update the manifest because one or more Docker builds did not succeed');
  }
  core.info('All builds passed, continuing with manifest update...');

  const argusInfraDirs = determineArgusAppDirs(inputs.images);

  const uniqueArgusInfraDirs = [...new Set(argusInfraDirs)];
  core.info(`Argus infra dirs to update: [${uniqueArgusInfraDirs.join(',')}]`);

  uniqueArgusInfraDirs.forEach((infraDir) => {
    inputs.envs.forEach((env) => {
      const filePath = path.join(infraDir, env, 'values.yaml');
      core.info(`Updating ${filePath} to use image tag ${inputs.imageTag}`);
      child_process.execSync(`yq eval -i '(.. | select(has("tag")) | select(.tag == "sha-*")).tag = "${inputs.imageTag}"' ${filePath}`);

      core.info(`Updated ${infraDir}/${env}/values.yaml\n---`);
      child_process.execSync(`cat ${filePath}`, { stdio: 'inherit' });
      core.info('---');
    });
  });
}

export function determineArgusAppDirs(images: ProcessedImage[]): string[] {
  return images.map((image) => {
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
}
