import * as core from '@actions/core';
import * as github from '@actions/github';
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


}
