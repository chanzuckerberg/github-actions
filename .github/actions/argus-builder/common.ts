import * as core from '@actions/core';
import * as github from '@actions/github';

export type ProcessedImage = {
  name: string
  context: string
  dockerfile: string
  platform: string
  build_args: string
  secret_files: string
  argus_root: string
  compression: string
  compression_level: string
  force_compression: boolean
  files_matched: boolean
  branch_matched: boolean
  should_build: boolean
};

export function getCommaDelimitedArrayInput(name: string, opts: core.InputOptions): string[] {
  return core.getInput(name, opts).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
}

export function getBuildTag(): string {
  const imageTag = `sha-${getTriggerSha().slice(0, 7)}`;
  if (imageTag === 'sha-') {
    const msg = `The image tag [${imageTag}] is invalid.`;
    core.setFailed(msg);
    throw new Error(msg);
  }

  core.info(`> Image tag: ${imageTag}`);
  return imageTag;
}

export function getTriggerSha(): string {
  const { eventName } = github.context;
  if (eventName === 'pull_request') {
    return github.context.payload.pull_request?.head.sha;
  }
  // push, workflow_dispatch, repository_dispatch, and any other event type
  // all have a usable context SHA.
  return github.context.sha;
}
