import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';
// eslint-disable-next-line import/no-relative-packages
import { getCommaDelimitedArrayInput, ProcessedImage } from '../../common';

type Inputs = {
  githubToken: string
  shouldDeploy: boolean
  images: ProcessedImage[]
  imageTag: string
  buildResults: string[]
  envs: string[]
};

export function getInputs(): Inputs {
  return {
    githubToken: core.getInput('github_token', { required: true }),
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

  const valuesFilesToUpdate = determineArgusVaulesFilesToUpdate(inputs.images, inputs.envs);

  valuesFilesToUpdate.forEach((filePath) => {
    core.info(`Updating ${filePath} to use image tag ${inputs.imageTag}`);
    updateTagsInFile(filePath, inputs.imageTag);

    core.info(`Updated ${filePath}\n---`);
    child_process.execSync(`cat ${filePath}`, { stdio: 'inherit' });
    core.info('---');
    child_process.execSync(`git add ${filePath}`);
  });

  child_process.execSync(`git diff`, { stdio: 'inherit' });
  try {
    const result = child_process.execSync(`git diff --staged --exit-code`);
    core.info(`Command succeeded with output: ${result.toString()}`);
  } catch (error: any) {
    core.error(`Command failed with exit code: ${JSON.stringify(error, null, 2)}`);
    // core.error(`Error message: ${error.message}`);
  }
  // child_process.execSync(`git commit -m "chore: Updated [${{ steps.parse_envs.outputs.envs }}] values.yaml image tags to ${{ inputs.image_tag }}"`)
  // child_process.execSync(`git push`)

  // const gitClient = github.getOctokit(inputs.githubToken)
}

export function determineArgusVaulesFilesToUpdate(images: ProcessedImage[], envs: string[]): string[] {
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
      files.push(path.join(infraDir, env, 'values.yaml'));
    });
  });

  return files;
}

export function updateTagsInFile(filePath: string, imageTag: string): void {
  child_process.execSync(`yq eval -i '(.. | select(has("tag")) | select(.tag == "sha-*")).tag = "${imageTag}"' ${filePath}`);
}
