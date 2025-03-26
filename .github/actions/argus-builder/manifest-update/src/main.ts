import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';
// eslint-disable-next-line import/no-relative-packages
import { getCommaDelimitedArrayInput, ProcessedImage } from '../../common';

type Inputs = {
  shouldBuild: boolean
  shouldDeploy: boolean
  images: ProcessedImage[]
  imageTag: string
  buildResults: string[]
  envs: string[]
};

export function getInputs(): Inputs {
  return {
    shouldBuild: core.getBooleanInput('should_build', { required: true }),
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

  const allBuildsPassed = inputs.buildResults.every((result) => result === 'success');
  if (!allBuildsPassed) {
    throw new Error('We won\'t update the manifest because one or more Docker builds did not succeed');
  }
  core.info('All builds passed, continuing with manifest update...');

  const argusRootDirs = inputs.images.filter((image) => image.should_build).map((image) => image.argus_root.trim()).filter((b) => b.length > 0);
  console.log('Argus root dirs:', argusRootDirs);

  const infraDirPaths = argusRootDirs.map((dir) => {
    const infraDirPath = path.join(dir, '.infra');
    if (!fs.existsSync(infraDirPath)) {
      throw new Error(`.infra directory not found at ${infraDirPath}`);
    }
    return infraDirPath;
  });
  const uniqueInfraDirPaths = [...new Set(infraDirPaths)];
  core.info(`Updating [uniqueInfraDirPaths.join(',')] to use image tag ${inputs.imageTag}`);

  inputs.envs.forEach((env) => {
    uniqueInfraDirPaths.forEach((infraDir) => {
      const filePath = path.join(infraDir, env, 'values.yaml');
      child_process.execSync(`yq eval -i '(.. | select(has("tag")) | select(.tag == "sha-*")).tag = "${inputs.imageTag}"' ${filePath}`);
      core.info(`Updated ${infraDir}/${env}/values.yaml`);
      child_process.execSync(`cat ${filePath}`);
    });
  });
}
