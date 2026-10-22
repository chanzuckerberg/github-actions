import {
  findMatchingChangedFiles,
  getPullRequestLabels,
  isLabelOnPullRequest,
  isMatchingBranch,
  ProcessedImage,
  processImagesInput,
  shouldUpdateManifests,
  wildcardMatch,
} from './main';

// mock core to suppress logs
jest.mock('@actions/core');

function fakeOctokit(listPullRequestsAssociatedWithCommit: jest.Mock) {
  return { rest: { repos: { listPullRequestsAssociatedWithCommit } } } as unknown as Parameters<typeof getPullRequestLabels>[1];
}

const pushContext = { payload: {}, repo: { owner: 'chanzuckerberg', repo: 'argus' }, sha: 'abc123' };

describe('shouldUpdateManifests', () => {
  it('does not look up labels when the build is skipped', async () => {
    const hasTriggerLabel = jest.fn(async () => true);
    expect(await shouldUpdateManifests(false, false, hasTriggerLabel)).toBe(false);
    expect(await shouldUpdateManifests(false, true, hasTriggerLabel)).toBe(false);
    expect(hasTriggerLabel).not.toHaveBeenCalled();
  });

  it('does not look up labels when manifest updates are forced', async () => {
    const hasTriggerLabel = jest.fn(async () => false);
    expect(await shouldUpdateManifests(true, true, hasTriggerLabel)).toBe(true);
    expect(hasTriggerLabel).not.toHaveBeenCalled();
  });

  it('uses the label lookup otherwise', async () => {
    expect(await shouldUpdateManifests(true, false, async () => true)).toBe(true);
    expect(await shouldUpdateManifests(true, false, async () => false)).toBe(false);
  });
});

describe('getPullRequestLabels', () => {
  it('reads labels from the payload on pull_request events without calling the API', async () => {
    const list = jest.fn();
    const context = {
      ...pushContext,
      payload: { pull_request: { number: 1, state: 'open', labels: [{ name: 'stack' }, { name: 'bug' }] } },
    };
    expect(await getPullRequestLabels(context, fakeOctokit(list))).toEqual(['stack', 'bug']);
    expect(list).not.toHaveBeenCalled();
  });

  it('returns undefined for a closed pull request in the payload', async () => {
    const context = { ...pushContext, payload: { pull_request: { number: 1, state: 'closed', labels: [{ name: 'stack' }] } } };
    expect(await getPullRequestLabels(context, fakeOctokit(jest.fn()))).toBeUndefined();
  });

  it('looks up the open pull request for the commit on push events', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [
        { state: 'closed', labels: [{ name: 'old' }] },
        { state: 'open', labels: [{ name: 'stack' }] },
      ],
    });
    expect(await getPullRequestLabels(pushContext, fakeOctokit(list))).toEqual(['stack']);
    expect(list).toHaveBeenCalledWith({ owner: 'chanzuckerberg', repo: 'argus', commit_sha: 'abc123' });
  });

  it('returns undefined when the commit has no open pull request', async () => {
    const list = jest.fn().mockResolvedValue({ data: [{ state: 'closed', labels: [] }] });
    expect(await getPullRequestLabels(pushContext, fakeOctokit(list))).toBeUndefined();
  });
});

describe('validate-json-schema', () => {
  describe('wildcardMatch', () => {
    it('should match exact string', () => {
      expect(wildcardMatch('test', 'test')).toBe(true);
    });

    it('should match wildcard', () => {
      expect(wildcardMatch('test', 't*')).toBe(true);
    });

    it('should not match', () => {
      expect(wildcardMatch('test', 't')).toBe(false);
    });

    it('should match wildcards with extra characters', () => {
      expect(wildcardMatch('test', 't*st')).toBe(true);
    });

    it('should match multiple wildcards', () => {
      expect(wildcardMatch('testing', 't*t*g')).toBe(true);
    });

    it('should match regex characters as literaly', () => {
      expect(wildcardMatch('amd[64]', 'amd[64]')).toBe(true);
      expect(wildcardMatch('amd[64]', 'amd[6*')).toBe(true);
      expect(wildcardMatch('$mylabel', '$mylabel')).toBe(true);
      expect(wildcardMatch('$mylabel', '$mylab*')).toBe(true);
    });
  });

  describe('isMatchingBranch', () => {
    it('should match exact branch', () => {
      expect(isMatchingBranch({
        branchesInclude: ['main'],
        branchesIgnore: [],
        branch: 'main',
      })).toBe(true);
    });

    it('should match wildcard branch', () => {
      expect(isMatchingBranch({
        branchesInclude: ['*'],
        branchesIgnore: [],
        branch: 'feature/test',
      })).toBe(true);
    });

    it('should not match wildcard branch with exclusion', () => {
      expect(isMatchingBranch({
        branchesInclude: ['*'],
        branchesIgnore: ['feature/*'],
        branch: 'feature/test',
      })).toBe(false);
    });
  });

  describe('findMatchingChangedFiles', () => {
    it('should match path', () => {
      expect(findMatchingChangedFiles(['src/main.ts'], [['src/main.ts']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts'], [['src/*.ts']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts'], [['**/*']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['src/*.ts']])).toEqual(['src/main.ts', 'src/test.ts']);
      expect(
        findMatchingChangedFiles(['lib/main.ts', 'src/test.ts'], [['lib/*.ts'], ['src/test.ts']]),
      ).toEqual(['lib/main.ts', 'src/test.ts']);
      expect(findMatchingChangedFiles(['src/main.ts'], [['./src/main.ts']])).toEqual(['src/main.ts']);
    });

    it('should not match', () => {
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['lib/*.ts']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['src/*.ts', '!src/test.ts']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/test.ts'], [['!src/**']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/test.ts'], [['!src/*.ts']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/test.ts'], [['!src/test.ts']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/test.ts'], [['!./src/test.ts']])).toEqual([]);
    });
  });

  describe('isLabelOnPullRequest', () => {
    it('should match label', () => {
      expect(isLabelOnPullRequest(['testlabel'], ['testlabel'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel', 'testlabel2'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['test*'])).toBe(true);
    });

    it('should not match label', () => {
      expect(isLabelOnPullRequest([], ['testlabel'])).toBe(false);
      expect(isLabelOnPullRequest(['testlabel'], ['testlabel2'])).toBe(false);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel3'])).toBe(false);
    });
  });

  describe('processImagesInput', () => {
    it('processes platform, build_args, secret_files, and argus_root', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            build_args: ['ARG1=VALUE1', 'ARG2=VALUE2'],
            secret_files: ['secret.txt', 'secret2.txt'],
            argus_root: 'frontend',
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: 'ARG1=VALUE1\nARG2=VALUE2',
        secret_files: 'secret.txt\nsecret2.txt',
        argus_root: 'frontend',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }]);
    });

    it('is expected to build with default branch and file filters', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }]);
    });

    it('is NOT expected to build with default branch and file filters when no files changed', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
          },
        },
        [],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: false,
        branch_matched: true,
        should_build: false,
      }]);
    });

    it('is NOT expected to build when branch does not match', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            branches_include: ['main'],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: false,
        should_build: false,
      }]);
    });

    it('is NOT expected to build when branch is excluded', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            branches_ignore: ['feature-*'],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: false,
        should_build: false,
      }]);
    });

    it('is expected to build when branch is included', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            branches_include: ['feature-*'],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }]);
    });

    it('is expected to build when changed files match path filters', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            path_filters: ['src/*.ts'],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }]);
    });

    it('is NOT expected to build when changed files do not match path filters', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            path_filters: ['lib/*.ts'],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: false,
        branch_matched: true,
        should_build: false,
      }]);

      const processedImage2: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            path_filters: [['src/**', '!src/main.ts']],
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage2).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: '',
        compression_level: '',
        force_compression: false,
        files_matched: false,
        branch_matched: true,
        should_build: false,
      }]);
    });

    it('passes through compression settings when specified', () => {
      const processedImage: ProcessedImage[] = processImagesInput(
        {
          frontend: {
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            compression: 'zstd',
            compression_level: '3',
            force_compression: true,
          },
        },
        ['src/main.ts'],
        'feature-123',
      );

      expect(processedImage).toEqual([{
        name: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        argus_root: '.',
        compression: 'zstd',
        compression_level: '3',
        force_compression: true,
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }]);
    });
  });
});
