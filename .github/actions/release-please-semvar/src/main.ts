import * as core from '@actions/core';
import { GitHub } from 'release-please/build/src/github';
import { Manifest, CreatedRelease } from 'release-please/build/src/manifest';
import { PreserveValuesPlugin } from './preserve-values-plugin';
import { updateFloatingTags } from './floating-tags';

interface ActionInputs {
  appToken: string;
  includeComponentInTag: boolean;
  preserveFiles: string[];
}

function getInputs(): ActionInputs {
  const raw = core.getInput('preserve_files', { required: false }) || '';
  const preserveFiles = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    appToken: core.getInput('app_token', { required: true }),
    includeComponentInTag: core.getBooleanInput('include_component_in_tag', { required: false }),
    preserveFiles,
  };
}

function parseRepoUrl(): { owner: string; repo: string } {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY env var is not set');
  }
  const [owner, repo] = repository.split('/');
  return { owner, repo };
}

async function run(): Promise<void> {
  const inputs = getInputs();
  const { owner, repo } = parseRepoUrl();

  core.info(`Creating release-please client for ${owner}/${repo}`);
  const github = await GitHub.create({
    owner,
    repo,
    token: inputs.appToken,
  });

  const targetBranch = github.repository.defaultBranch;
  core.info(`Target branch: ${targetBranch}`);

  const manifest = await Manifest.fromManifest(
    github,
    targetBranch,
  );

  if (inputs.preserveFiles.length > 0) {
    core.info(`Registering preserve-values plugin for patterns: ${inputs.preserveFiles.join(', ')}`);
    manifest.plugins.push(
      new PreserveValuesPlugin(
        github,
        targetBranch,
        manifest.repositoryConfig,
        inputs.preserveFiles,
      ),
    );
  }

  core.info('Creating/updating release pull requests...');
  const prs = await manifest.createPullRequests();
  const prCount = prs.filter(Boolean).length;
  core.info(`Created/updated ${prCount} pull request(s)`);

  core.info('Creating releases for merged PRs (if any)...');
  const releases = await manifest.createReleases();
  const createdReleases = releases.filter((r): r is CreatedRelease => r !== undefined);
  core.info(`Created ${createdReleases.length} release(s)`);

  if (createdReleases.length > 0) {
    core.info('Updating floating major/minor tags...');
    await updateFloatingTags(github, createdReleases, manifest.repositoryConfig);
  }

  core.info('Done');
}

run().catch((err) => {
  core.setFailed(err.message || String(err));
});
