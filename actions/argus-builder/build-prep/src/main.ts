import * as core from '@actions/core';
import * as github from '@actions/github';
import { minimatch } from 'minimatch';
// eslint-disable-next-line import/no-relative-packages
import { findChangedFiles } from '../../../../.github/actions/find-changed-files/src/findChangedFiles';
// eslint-disable-next-line import/no-relative-packages
import { validateJsonSchema } from '../../../../.github/actions/validate-json-schema/src/validateJsonSchema';

type Inputs = {
  githubToken: string
  images: Record<string, any>
  pathFilters: string[]
  // pathFiltersBase: string
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
    // pathFiltersBase: core.getInput('path_filters_base', { required: true }),
    branchesInclude: getCommaDelimitedArrayInput('branches_include', { required: true }),
    branchesIgnore: getCommaDelimitedArrayInput('branches_ignore', { required: true }),
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
      skip_manifest_update: { type: 'boolean' },
    },
    required: ['context', 'dockerfile'],
  },
};

if (process.env.NODE_ENV !== 'test') {
  main();
}
export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  validateJsonSchema(inputs.images, imagesInputSchema);
  core.info('Images input is valid');

  core.info('Checking overall build conditions...');
  const branchMatched = isMatchingBranch({
    branchesInclude: inputs.branchesInclude,
    branchesIgnore: inputs.branchesIgnore,
    branch: getCurrentBranch(),
  });

  const changedFiles = (await findChangedFiles(inputs.githubToken)).allModifiedFiles;
  const matchedFiles: string[] = findMatchingChangedFiles(changedFiles, inputs.pathFilters.map((f: string) => [f]));
  const filesMatched: boolean = matchedFiles.length > 0;

  const imageTag = getBuildTag();
  core.setOutput('image_tag', imageTag);

  const hasTriggerLabel = checkPullRequestForLabel(inputs);
  core.setOutput('should_deploy', hasTriggerLabel);

  const shouldBuild = filesMatched && branchMatched;
  core.setOutput('should_build', shouldBuild);
  core.info(`> Branch matched? ${branchMatched}. Files matched? ${filesMatched}. Build should run? ${shouldBuild}`);

  core.info('Checking image-specific build conditions...');
  const processedImages = processImagesInput(inputs, changedFiles);
  core.setOutput('images', JSON.stringify(processedImages, null, 2));
}

function wildcardMatch(text: string, pattern: string): boolean {
  const regexPattern = new RegExp(`^${pattern.replace(/\?/g, '.').replace(/\*/g, '.*')}$`);
  return regexPattern.test(text);
}

function isMatchingBranch(
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

function getCurrentBranch(): string {
  return github.context.ref.replace('refs/heads/', '');
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

function processImagesInput(inputs: Inputs, changedFiles: string[]): object[] {
  const processedImages = Object.entries(inputs.images).map(([name, image]) => {
    const processedImage = { ...image };
    processedImage.name = name;

    const buildArgs = image.build_args || [];
    processedImage.build_args = buildArgs.join('\n');

    const secretFiles = image.secret_files || [];
    processedImage.secret_files = secretFiles.join('\n');

    const argusRoot = image.argus_root || '.';
    processedImage.argus_root = argusRoot;

    const pathFilters: string[][] = (image.path_filters || ['**/*']).map((f: any) => (Array.isArray(f) ? f : [f]));

    core.info(`---\nLooking for file changes that match the filters for image: ${name}`);
    const filesMatched = findMatchingChangedFiles(changedFiles, pathFilters);
    core.info(`> Files matched: ${filesMatched}`);
    processedImage.files_matched = filesMatched.length > 0;

    const branchesInclude = (image.branches_include || ['*']).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
    const branchesIgnore = (image.branches_ignore || []).map((b: string) => b.trim()).filter((b: string) => b.length > 0);
    processedImage.branch_matched = isMatchingBranch({
      branchesInclude,
      branchesIgnore,
      branch: getCurrentBranch(),
    });

    processedImage.should_build = image.files_matched && image.branch_matched;

    return processedImage;
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
  core.info(`- Pull request labels: ${labels}`);

  const hasTriggerLabel = !!labels.find((label) => inputs.manifestTriggerLabels.find((triggerLabel) => {
    const match = wildcardMatch(label, triggerLabel);
    if (match) {
      core.info(`> Pull request contains label [${label}] which matches trigger label [${triggerLabel}]`);
    }
    return match;
  }));

  if (!hasTriggerLabel) {
    core.info(
      `> Pull request contains labels [${labels.join(',')}] but none of them match the trigger labels: ${inputs.manifestTriggerLabels}`,
    );
  }

  return hasTriggerLabel;
}

function findMatchingChangedFiles(changedFiles: string[], pathFilters: string[][]): string[] {
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
