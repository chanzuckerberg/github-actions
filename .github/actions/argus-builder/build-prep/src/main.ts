import * as core from '@actions/core';
import * as github from '@actions/github';
import path from 'path';
import { minimatch } from 'minimatch';
import { escapeRegExp } from 'lodash';
// eslint-disable-next-line import/no-relative-packages
import { findChangedFiles } from '../../../find-changed-files/src/findChangedFiles';
// eslint-disable-next-line import/no-relative-packages
import { validateJsonSchema } from '../../../validate-json-schema/src/validateJsonSchema';
// eslint-disable-next-line import/no-relative-packages
import { getCommaDelimitedArrayInput, ProcessedImage } from '../../common';

// eslint-disable-next-line import/no-relative-packages
export { ProcessedImage } from '../../common';

const imagesInputSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: false,
    properties: {
      context: { type: 'string' },
      dockerfile: { type: 'string' },
      platform: { type: 'string' },
      build_args: {
        type: 'array',
        items: { type: 'string' },
      },
      secret_files: {
        type: 'array',
        items: { type: 'string' },
      },
      argus_root: { type: 'string' },
      path_filters: {
        type: 'array',
        items: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
      },
      branches_include: { type: 'array', items: { type: 'string' } },
      branches_ignore: { type: 'array', items: { type: 'string' } },
    },
    required: ['context', 'dockerfile'],
  },
};

type ImageInput = {
  context: string
  dockerfile: string
  platform?: string
  build_args?: string[]
  secret_files?: string[]
  argus_root?: string
  path_filters?: string[] | string[][]
  branches_include?: string[]
  branches_ignore?: string[]
};

type Inputs = {
  githubToken: string
  images: Record<string, ImageInput>
  pathFilters: string[]
  branchesInclude: string[]
  branchesIgnore: string[]
  manifestTriggerLabels: string[]
  forceUpdateManifests: boolean
};

export function getInputs(): Promise<Inputs> {
  return core.group('Gather inputs', async () => {
    const inputs = {
      githubToken: core.getInput('github_token', { required: true }),
      images: JSON.parse(core.getInput('images', { required: true })),
      pathFilters: getCommaDelimitedArrayInput('path_filters', { required: true }),
      branchesInclude: getCommaDelimitedArrayInput('branches_include', { required: true }),
      branchesIgnore: getCommaDelimitedArrayInput('branches_ignore', { required: false }),
      manifestTriggerLabels: getCommaDelimitedArrayInput('manifest_trigger_labels', { required: true }),
      forceUpdateManifests: core.getBooleanInput('force_update_manifests', { required: false }),
    };

    core.info(`Received inputs: ${JSON.stringify(inputs, null, 2)}`);

    core.info('Validating images input...');
    validateJsonSchema(inputs.images, imagesInputSchema);
    return inputs;
  });
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
export async function main() {
  const inputs = await getInputs();

  const changedFiles = await core.group(
    'Finding changed files...',
    async () => (await findChangedFiles(inputs.githubToken)).allModifiedFiles,
  );

  const currentBranch = github.context.ref.replace('refs/heads/', '');
  const imageTag = getBuildTag();
  core.setOutput('image_tag', imageTag);

  const outputs = await core.group('Checking overall build conditions...', async () => {
    const branchMatched = isMatchingBranch({
      branchesInclude: inputs.branchesInclude,
      branchesIgnore: inputs.branchesIgnore,
      branch: currentBranch,
    });

    const matchingFiles: string[] = findMatchingChangedFiles(changedFiles, inputs.pathFilters.map((f: string) => [f]));
    // For workflow_dispatch events, treat all files as matched (allows manual builds to proceed)
    const filesMatched: boolean = github.context.eventName === 'workflow_dispatch' || matchingFiles.length > 0;

    const hasImages = Object.keys(inputs.images).length > 0;
    if (!hasImages) {
      core.info('> No images found in the input - skipping build and deploy');
    }

    const shouldBuild = hasImages && filesMatched && branchMatched;
    core.setOutput('should_build', shouldBuild);

    const hasTriggerLabel = await checkPullRequestForLabel(inputs);
    // only update manifests if the build should run and the trigger label is present (or forceUpdateManifests is true)
    const shouldDeploy = shouldBuild && (hasTriggerLabel || inputs.forceUpdateManifests);
    core.setOutput('should_deploy', shouldDeploy);

    return {
      branchMatched,
      filesMatched,
      shouldBuild,
      shouldDeploy,
    };
  });

  core.info(`> Overall build conditions: ${JSON.stringify({
    'Branch matched?': outputs.branchMatched,
    'Files matched?': outputs.filesMatched,
    'Build should run?': outputs.shouldBuild,
    'Manifests should be updated?': outputs.shouldDeploy,
  }, null, 2)}`);

  const processedImages = await core.group(
    'Checking image-specific build conditions...',
    async () => processImagesInput(inputs.images, changedFiles, currentBranch),
  );
  core.info(`> Images configuration: ${JSON.stringify(processedImages, null, 2)}`);
  core.setOutput('images', processedImages);
}

export function wildcardMatch(text: string, pattern: string): boolean {
  const safePattern = escapeRegExp(pattern).replace(/\\\?/g, '.').replace(/\\\*/g, '.*');
  const regexPattern = new RegExp(`^${safePattern}$`);
  return regexPattern.test(text);
}

export function isMatchingBranch(
  { branchesInclude, branchesIgnore, branch }: { branchesInclude: string[], branchesIgnore: string[], branch: string },
): boolean {
  core.info('Checking if branch matches the branch filters');
  core.info(`- Branches to run on: [${branchesInclude.join(',')}]`);
  core.info(`- Branches to ignore: [${branchesIgnore.join(',')}]`);
  core.info(`- Branch to check: ${branch}`);

  const shouldRun = branchesInclude.some((b) => wildcardMatch(branch, b)) && !branchesIgnore.some((b) => wildcardMatch(branch, b));
  if (shouldRun) {
    core.info(`> Current branch "${branch}" matches the branch filters`);
  } else {
    core.info(`> Current branch "${branch}" does NOT match the branch filters`);
  }
  return shouldRun;
}

function getBuildTag(): string {
  const imageTag = `sha-${getTriggerSha().slice(0, 7)}`;
  if (imageTag === 'sha-') {
    const msg = `The image tag [${imageTag}] is invalid.`;
    core.setFailed(msg);
    throw new Error(msg);
  }

  core.info(`> Image tag: ${imageTag}`);
  return imageTag;
}

function getTriggerSha(): string {
  const { eventName } = github.context;
  if (eventName === 'pull_request') {
    return github.context.payload.pull_request?.head.sha;
  } if (eventName === 'push') {
    return github.context.sha;
  } if (eventName === 'workflow_dispatch') {
    return github.context.sha;
  }
  const errMsg = `EventName ${eventName} not supported`;
  core.setFailed(errMsg);
  throw new Error(errMsg);
}

export function processImagesInput(images: Record<string, ImageInput>, changedFiles: string[], currentBranch: string): ProcessedImage[] {
  const cleanArray = (arr: string[]) => arr.map((arg: string) => arg.trim()).filter((arg: string) => arg.length > 0);

  const processedImages = Object.entries(images).map(([name, image]) => {
    const buildArgs = cleanArray(image.build_args || []).join('\n');
    const secretFiles = cleanArray(image.secret_files || []).join('\n');
    const argusRoot = image.argus_root || '.';

    const pathFilters: string[][] = (image.path_filters || ['**/*']).map((f: any) => (Array.isArray(f) ? f : [f]));

    core.info(`---\nLooking for file changes that match the filters for image: ${name}`);
    const matchingFiles = findMatchingChangedFiles(changedFiles, pathFilters);
    core.info(`> Files matched: ${matchingFiles}`);
    // For workflow_dispatch events, treat all files as matched (allows manual builds to proceed)
    const filesMatched = github.context.eventName === 'workflow_dispatch' || matchingFiles.length > 0;

    const branchesInclude = cleanArray(image.branches_include || ['*']);
    const branchesIgnore = cleanArray(image.branches_ignore || []);
    const branchMatched = isMatchingBranch({
      branchesInclude,
      branchesIgnore,
      branch: currentBranch,
    });

    return {
      name,
      context: image.context,
      dockerfile: image.dockerfile,
      platform: image.platform || 'linux/arm64',
      build_args: buildArgs,
      secret_files: secretFiles,
      argus_root: argusRoot,
      files_matched: filesMatched,
      branch_matched: branchMatched,
      should_build: filesMatched && branchMatched,
    };
  });
  return processedImages;
}

async function checkPullRequestForLabel(inputs: Inputs): Promise<boolean> {
  const gitClient = github.getOctokit(inputs.githubToken);

  const sha = getTriggerSha();
  const result = await gitClient.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: sha,
  });

  const openPRs = result.data.filter((pr) => pr.state === 'open');
  if (openPRs.length === 0) {
    core.info('> No open pull requests found - manifests will not be updated');
    return false;
  }

  const pr = openPRs[0];
  const labels = pr.labels.map((label: { name: string }) => label.name);
  const prLabelsJoined = labels.join(',');
  core.info(`- Pull request labels: [${prLabelsJoined}]`);

  const hasTriggerLabel = isLabelOnPullRequest(labels, inputs.manifestTriggerLabels);
  if (!hasTriggerLabel) {
    const triggerLabelsJoined = inputs.manifestTriggerLabels.join(',');
    core.info(`> Pull request contains labels [${prLabelsJoined}] but none of them match the trigger labels: [${triggerLabelsJoined}]`);
  }

  return hasTriggerLabel;
}

export function isLabelOnPullRequest(labels: string[], triggerLabels: string[]): boolean {
  return !!labels.find((label) => triggerLabels.find((triggerLabel) => {
    const match = wildcardMatch(label, triggerLabel);
    if (match) {
      core.info(`> Pull request contains label [${label}] which matches trigger label [${triggerLabel}]`);
    }
    return match;
  }));
}

export function findMatchingChangedFiles(changedFiles: string[], pathFilters: string[][]): string[] {
  return changedFiles.filter((file) => {
    core.info(`Checking file: ${file}`);
    const sanitizedFile = path.normalize(file); // path sanitization to ensure consistent path format
    return pathFilters.some((filters) => {
      core.info(`- checking filters: ${filters}`);
      const matchedFile = filters.every((filter) => minimatch(sanitizedFile, sanitizePathFilter(filter), { dot: true }));
      core.info(`- matched file ${file} with filters ${filters}? ${matchedFile}`);
      return matchedFile;
    });
  });
}

function sanitizePathFilter(p: string): string {
  const match = p.match(/^!+/);
  const exclamations = match ? match[0] : '';
  const remainder = match ? p.slice(exclamations.length) : p;
  const joined = path.normalize(remainder);
  if (exclamations.length % 2 === 1) {
    // If the number of exclamations is odd, all but one negate each other, so we return the negated path
    return `!${joined}`;
  }
  // If there are an even number of exclamations, we can return the joined path as is - they negate each other
  return joined;
}
