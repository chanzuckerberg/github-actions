import * as core from '@actions/core';
import * as github from '@actions/github';
import path from 'path';
import { minimatch } from 'minimatch';
import { escapeRegExp } from 'lodash';
// eslint-disable-next-line import/no-relative-packages
import { findChangedFiles } from '../../../find-changed-files/src/findChangedFiles';
// eslint-disable-next-line import/no-relative-packages
import { validateJsonSchema } from '../../../validate-json-schema/src/validateJsonSchema';
import {
  getCommaDelimitedArrayInput, ProcessedImage,
  getBuildTag,
  getTriggerSha,
} from '../../common'; // eslint-disable-line import/no-relative-packages

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
      compression: { type: 'string', enum: ['gzip', 'zstd', 'estargz'] },
      compression_level: { type: 'string' },
      force_compression: { type: 'boolean' },
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
  compression?: string
  compression_level?: string
  force_compression?: boolean
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
    const filesMatched: boolean = matchingFiles.length > 0;

    const hasImages = Object.keys(inputs.images).length > 0;
    if (!hasImages) {
      core.info('> No images found in the input - skipping build and deploy');
    }

    const shouldBuild = hasImages && filesMatched && branchMatched;
    core.setOutput('should_build', shouldBuild);

    const shouldDeploy = await shouldUpdateManifests(shouldBuild, inputs.forceUpdateManifests, () => checkPullRequestForLabel(inputs));
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
    const filesMatched = matchingFiles.length > 0;

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
      compression: image.compression || '',
      compression_level: image.compression_level || '',
      force_compression: image.force_compression || false,
      files_matched: filesMatched,
      branch_matched: branchMatched,
      should_build: filesMatched && branchMatched,
    };
  });
  return processedImages;
}

// Manifests are updated only when the build runs, and then either always (forceUpdateManifests) or
// when the pull request has a trigger label. The label lookup calls the GitHub API, so it is skipped
// whenever its answer can't change the result.
export async function shouldUpdateManifests(
  shouldBuild: boolean,
  forceUpdateManifests: boolean,
  hasTriggerLabel: () => Promise<boolean>,
): Promise<boolean> {
  if (!shouldBuild) {
    return false;
  }
  if (forceUpdateManifests) {
    return true;
  }
  return hasTriggerLabel();
}

const githubAPIAttempts = 4;
const githubAPIRetryBaseDelayMs = 2000;

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

function isTransientGitHubError(status: number | undefined): boolean {
  // No status means the request never got a response.
  return status === undefined || status === 429 || status >= 500;
}

// withRetries retries a GitHub API call that fails transiently, with exponential backoff, and
// otherwise rethrows with the status in the message, since Octokit's error message is empty when
// GitHub returns an empty error body.
export async function withRetries<T>(
  description: string,
  call: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = defaultSleep,
  attempt = 1,
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const { status } = err as { status?: number };
    const statusText = status === undefined ? 'no response' : `status ${status}`;
    if (!isTransientGitHubError(status) || attempt >= githubAPIAttempts) {
      throw new Error(`${description} failed with ${statusText} after ${attempt} attempt(s): ${(err as Error).message}`);
    }
    const delayMs = githubAPIRetryBaseDelayMs * 2 ** (attempt - 1);
    core.warning(`${description} failed with ${statusText}; retrying in ${delayMs / 1000}s (attempt ${attempt} of ${githubAPIAttempts})`);
    await sleep(delayMs);
    return withRetries(description, call, sleep, attempt + 1);
  }
}

type Octokit = ReturnType<typeof github.getOctokit>;
type PullRequestsForCommit = Awaited<ReturnType<Octokit['rest']['repos']['listPullRequestsAssociatedWithCommit']>>;

type LabelLookupContext = {
  payload: typeof github.context.payload
  repo: typeof github.context.repo
  sha: string
};

// getPullRequestLabels returns the labels of the open pull request for the triggering commit, or
// undefined when there is none. pull_request events carry the labels in their payload, so only
// push events need the GitHub API.
export async function getPullRequestLabels(
  context: LabelLookupContext,
  octokit: Octokit,
  sleep?: (ms: number) => Promise<void>,
): Promise<string[] | undefined> {
  const payloadPR = context.payload.pull_request;
  if (payloadPR) {
    if (payloadPR.state !== 'open') {
      return undefined;
    }
    return (payloadPR.labels ?? []).map((label: { name: string }) => label.name);
  }

  const result = await withRetries<PullRequestsForCommit>(
    `Listing pull requests for commit ${context.sha}`,
    () => octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
    }),
    sleep,
  );

  const openPR = result.data.find((pr) => pr.state === 'open');
  return openPR?.labels.map((label: { name: string }) => label.name);
}

async function checkPullRequestForLabel(inputs: Inputs): Promise<boolean> {
  const labels = await getPullRequestLabels(
    { payload: github.context.payload, repo: github.context.repo, sha: getTriggerSha() },
    github.getOctokit(inputs.githubToken),
  );
  if (labels === undefined) {
    core.info('> No open pull requests found - manifests will not be updated');
    return false;
  }

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
