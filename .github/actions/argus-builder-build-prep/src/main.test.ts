import {
  findMatchingChangedFiles, isLabelOnPullRequest, isMatchingBranch, ProcessedImage, processImagesInput, wildcardMatch,
} from './main';

// mock core to suppress logs
jest.mock('@actions/core');

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
    });

    it('should not match', () => {
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['lib/*.ts']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['src/*.ts', '!src/test.ts']])).toEqual(['src/main.ts']);
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
        files_matched: false,
        branch_matched: true,
        should_build: false,
      }]);
    });
  });
});
