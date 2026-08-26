import { computeFloatingTags } from './floating-tags';
import { CreatedRelease, RepositoryConfig } from 'release-please/build/src/manifest';

function makeRelease(overrides: Partial<CreatedRelease>): CreatedRelease {
  return {
    id: 1,
    name: 'test-release',
    tagName: 'v1.2.3',
    sha: 'abc123def456',
    url: 'https://github.com/owner/repo/releases/1',
    path: '.',
    version: '1.2.3',
    major: 1,
    minor: 2,
    patch: 3,
    prNumber: 42,
    ...overrides,
  };
}

describe('computeFloatingTags', () => {
  it('creates unprefixed vMAJOR and vMAJOR.MINOR tags for root packages', () => {
    const config: RepositoryConfig = {
      '.': { releaseType: 'simple' },
    };
    const release = makeRelease({ path: '.', major: 2, minor: 5 });
    const tags = computeFloatingTags(release, config);
    expect(tags).toEqual([
      { tagName: 'v2', message: 'Release v2' },
      { tagName: 'v2.5', message: 'Release v2.5' },
    ]);
  });

  it('creates name-prefixed vMAJOR and vMAJOR.MINOR tags for component packages', () => {
    const config: RepositoryConfig = {
      'projects/my-app': {
        releaseType: 'simple',
        component: 'my-app',
        packageName: 'my-app',
      },
    };
    const release = makeRelease({
      path: 'projects/my-app',
      major: 0,
      minor: 43,
    });
    const tags = computeFloatingTags(release, config);
    expect(tags).toEqual([
      { tagName: 'my-app-v0', message: 'Release v0' },
      { tagName: 'my-app-v0.43', message: 'Release v0.43' },
    ]);
  });

  it('strips colon suffixes from component names (name:path format)', () => {
    const config: RepositoryConfig = {
      'projects/foo': {
        releaseType: 'simple',
        component: 'foo',
        packageName: 'foo:projects/foo',
      },
    };
    const release = makeRelease({ path: 'projects/foo', major: 1, minor: 0 });
    const tags = computeFloatingTags(release, config);
    expect(tags[0].tagName).toBe('foo-v1');
  });

  it('returns empty array when component name is missing for a non-root path', () => {
    const config: RepositoryConfig = {
      'projects/unknown': { releaseType: 'simple' },
    };
    const release = makeRelease({ path: 'projects/unknown', major: 1, minor: 0 });
    const tags = computeFloatingTags(release, config);
    expect(tags).toEqual([]);
  });

  it('uses packageName when component is not set', () => {
    const config: RepositoryConfig = {
      'projects/bar': {
        releaseType: 'simple',
        packageName: 'bar',
      },
    };
    const release = makeRelease({ path: 'projects/bar', major: 3, minor: 1 });
    const tags = computeFloatingTags(release, config);
    expect(tags).toEqual([
      { tagName: 'bar-v3', message: 'Release v3' },
      { tagName: 'bar-v3.1', message: 'Release v3.1' },
    ]);
  });
});
