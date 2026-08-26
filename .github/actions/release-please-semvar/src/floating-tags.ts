import * as core from '@actions/core';
import { GitHub } from 'release-please/build/src/github';
import { CreatedRelease, RepositoryConfig, ROOT_PROJECT_PATH } from 'release-please/build/src/manifest';

interface FloatingTag {
  tagName: string;
  message: string;
}

/**
 * For a given created release, compute the floating major and minor tags.
 * Root packages (path ".") get unprefixed vMAJOR / vMAJOR.MINOR.
 * Component packages get name-vMAJOR / name-vMAJOR.MINOR.
 */
export function computeFloatingTags(
  release: CreatedRelease,
  repositoryConfig: RepositoryConfig,
): FloatingTag[] {
  const isRoot = release.path === ROOT_PROJECT_PATH || release.path === '.';
  const config = repositoryConfig[release.path];
  const componentName = config?.component || config?.packageName;

  if (isRoot) {
    return [
      { tagName: `v${release.major}`, message: `Release v${release.major}` },
      { tagName: `v${release.major}.${release.minor}`, message: `Release v${release.major}.${release.minor}` },
    ];
  }

  if (!componentName) {
    core.warning(`No component name for path ${release.path}, skipping floating tags`);
    return [];
  }

  // release-please tagName for components looks like "name-v1.2.3"; extract
  // just the component name from the config, matching the old action's
  // `outputs[path--name].split(":")[0]` behavior.
  const name = componentName.split(':')[0];

  return [
    { tagName: `${name}-v${release.major}`, message: `Release v${release.major}` },
    { tagName: `${name}-v${release.major}.${release.minor}`, message: `Release v${release.major}.${release.minor}` },
  ];
}

/**
 * Creates or updates floating major/minor tags for each created release.
 * Mirrors the behavior of the old composite action's tag-root and
 * tag-component steps: delete the old tag (both local and remote), then
 * recreate as an annotated tag.
 *
 * Uses the GitHub Git Refs API (not local git) since the action no longer
 * checks out the repository.
 */
export async function updateFloatingTags(
  github: GitHub,
  releases: CreatedRelease[],
  repositoryConfig: RepositoryConfig,
): Promise<void> {
  const gh = github as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const octokit = gh.gitHubApi?.octokit ?? gh.octokit;
  const { owner, repo } = github.repository;

  for (const release of releases) {
    const tags = computeFloatingTags(release, repositoryConfig);

    for (const { tagName, message } of tags) {
      const ref = `tags/${tagName}`;

      // Delete existing tag ref (ignore 404 if it doesn't exist yet)
      try {
        await octokit.git.deleteRef({ owner, repo, ref });
        core.info(`Deleted old tag ${tagName}`);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err.status !== 422 && err.status !== 404) throw err;
      }

      // Create annotated tag object pointing at the release SHA
      const { data: tagObject } = await octokit.git.createTag({
        owner,
        repo,
        tag: tagName,
        message,
        object: release.sha,
        type: 'commit',
      });

      // Create the ref pointing at the tag object
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/${ref}`,
        sha: tagObject.sha,
      });

      core.info(`Created floating tag ${tagName} → ${release.sha.slice(0, 7)}`);
    }
  }
}
