import * as core from '@actions/core';
import * as github from '@actions/github';
import { minimatch } from 'minimatch';
// eslint-disable-next-line import/no-relative-packages
import { findChangedFiles } from '../../find-changed-files/src/findChangedFiles';
// eslint-disable-next-line import/no-relative-packages
import { validateJsonSchema } from '../../validate-json-schema/src/validateJsonSchema';

type Inputs = {
  githubToken: string
  images: Record<string, any>
  pathFilters: string[]
  branchesInclude: string[]
  branchesIgnore: string[]
  manifestTriggerLabels: string[]
};

function getCommaDelimitedArrayInput(name: string, opts: core.InputOptions): string[] {
  return core.getInput(name, opts).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
}

export function getInputs(): Inputs {
  return {
    githubToken: core.getInput('github_token', { required: true }),
    images: JSON.parse(core.getInput('images', { required: true })),
    pathFilters: getCommaDelimitedArrayInput('path_filters', { required: true }),
    branchesInclude: getCommaDelimitedArrayInput('branches_include', { required: true }),
    branchesIgnore: getCommaDelimitedArrayInput('branches_ignore', { required: false }),
    manifestTriggerLabels: getCommaDelimitedArrayInput('manifest_trigger_labels', { required: true }),
  };
}

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

export type ProcessedImage = {
  name: string
  context: string
  dockerfile: string
  platform: string
  build_args: string
  secret_files: string
  argus_root: string
  files_matched: boolean
  branch_matched: boolean
  should_build: boolean
};

if (process.env.NODE_ENV !== 'test') {
  main();
}
export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  core.info('Validating images input...');
  validateJsonSchema(inputs.images, imagesInputSchema);
  core.info('> Images input is valid');

  core.info('Finding changed files...');
  const changedFiles = (await findChangedFiles(inputs.githubToken)).allModifiedFiles;

  core.info('Checking overall build conditions...');
  const currentBranch = github.context.ref.replace('refs/heads/', '');
  const branchMatched = isMatchingBranch({
    branchesInclude: inputs.branchesInclude,
    branchesIgnore: inputs.branchesIgnore,
    branch: currentBranch,
  });

  const matchingFiles: string[] = findMatchingChangedFiles(changedFiles, inputs.pathFilters.map((f: string) => [f]));
  const filesMatched: boolean = matchingFiles.length > 0;

  const imageTag = getBuildTag();
  core.setOutput('image_tag', imageTag);

  const hasTriggerLabel = await checkPullRequestForLabel(inputs);
  core.setOutput('should_deploy', hasTriggerLabel);

  const shouldBuild = filesMatched && branchMatched;
  core.setOutput('should_build', shouldBuild);
  core.info(`> Overall build conditions: ${JSON.stringify({
    'Branch matched?': branchMatched,
    'Files matched?': filesMatched,
    'Build should run?': shouldBuild,
    'Manifests should be updated?': hasTriggerLabel,
  }, null, 2)}`);

  core.info('Checking image-specific build conditions...');
  const processedImages = processImagesInput(inputs.images, changedFiles, currentBranch);
  core.setOutput('images', JSON.stringify(processedImages, null, 2));
}

export function wildcardMatch(text: string, pattern: string): boolean {
  const regexPattern = new RegExp(`^${pattern.replace(/\?/g, '.').replace(/\*/g, '.*')}$`);
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
    core.setFailed(`The image tag [${imageTag}] is invalid.`);
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
  }
  const errMsg = `EventName ${eventName} not supported`;
  core.setFailed(errMsg);
  throw new Error(errMsg);
}

export function processImagesInput(images: Record<string, ImageInput>, changedFiles: string[], currentBranch: string): ProcessedImage[] {
  const processedImages = Object.entries(images).map(([name, image]) => {
    const buildArgs = (image.build_args || []).map((arg: string) => arg.trim()).filter((arg: string) => arg.length > 0).join('\n');
    const secretFiles = (image.secret_files || []).map((f: string) => f.trim()).filter((f: string) => f.length > 0).join('\n');
    const argusRoot = image.argus_root || '.';

    const pathFilters: string[][] = (image.path_filters || ['**/*']).map((f: any) => (Array.isArray(f) ? f : [f]));

    core.info(`---\nLooking for file changes that match the filters for image: ${name}`);
    const matchingFiles = findMatchingChangedFiles(changedFiles, pathFilters);
    core.info(`> Files matched: ${matchingFiles}`);
    const filesMatched = matchingFiles.length > 0;

    const branchesInclude = (image.branches_include || ['*']).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
    const branchesIgnore = (image.branches_ignore || []).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
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
  core.info(`> Images configuration: ${JSON.stringify(processedImages, null, 2)}`);
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
    return pathFilters.some((filters) => {
      core.info(`- checking filters: ${filters}`);
      const matchedFile = filters.every((filter) => minimatch(file, filter, { dot: true }));
      core.info(`- matched file ${file} with filters ${filters}? ${matchedFile}`);
      return matchedFile;
    });
  });
}
