import {
  enumerateStacks,
  hasSharedChanges,
  parseBases,
  stackForFile,
  stacksFromChangedFiles,
} from './lib';

describe('parseBases', () => {
  it('splits, trims, and drops blank lines', () => {
    expect(parseBases('terraform/envs\n  terraform/accounts \n\n')).toEqual([
      'terraform/envs',
      'terraform/accounts',
    ]);
  });
});

describe('stackForFile', () => {
  const bases = ['terraform/envs', 'terraform/accounts'];

  it('maps an env component file up to the env stack', () => {
    expect(stackForFile('terraform/envs/dev-central/eks/main.tf', bases)).toBe(
      'terraform/envs/dev-central',
    );
  });

  it('maps an account file to the account stack', () => {
    expect(stackForFile('terraform/accounts/prod/main.tf', bases)).toBe(
      'terraform/accounts/prod',
    );
  });

  it('returns null for files outside any base', () => {
    expect(stackForFile('README.md', bases)).toBeNull();
  });
});

describe('stacksFromChangedFiles', () => {
  it('dedupes stacks and ignores unrelated files', () => {
    const bases = ['terraform/envs'];
    const files = [
      'terraform/envs/dev/eks/main.tf',
      'terraform/envs/dev/vpc/main.tf',
      'terraform/envs/prod/eks/main.tf',
      'docs/x.md',
    ];
    expect(stacksFromChangedFiles(files, bases)).toEqual([
      'terraform/envs/dev',
      'terraform/envs/prod',
    ]);
  });
});

describe('enumerateStacks', () => {
  it('lists one level below each existing base and skips missing ones', () => {
    const listDir = (base: string): string[] | null => (base === 'terraform/envs' ? ['dev', 'prod'] : null);
    expect(
      enumerateStacks(['terraform/envs', 'terraform/accounts'], listDir),
    ).toEqual(['terraform/envs/dev', 'terraform/envs/prod']);
  });
});

describe('hasSharedChanges', () => {
  it('returns true when a changed file is under a trigger path', () => {
    const files = ['terraform/modules/vpc/main.tf'];
    expect(hasSharedChanges(files, ['terraform/modules'])).toBe(true);
  });

  it('returns false when no changed files match', () => {
    const files = ['terraform/envs/dev/eks/main.tf', 'docs/x.md'];
    expect(hasSharedChanges(files, ['terraform/modules'])).toBe(false);
  });

  it('returns false when trigger paths are empty', () => {
    const files = ['terraform/modules/vpc/main.tf'];
    expect(hasSharedChanges(files, [])).toBe(false);
  });

  it('matches an exact trigger path', () => {
    const files = ['terraform/modules'];
    expect(hasSharedChanges(files, ['terraform/modules'])).toBe(true);
  });

  it('does not false-match a prefix that is not a directory boundary', () => {
    const files = ['terraform/modules-extra/foo.tf'];
    expect(hasSharedChanges(files, ['terraform/modules'])).toBe(false);
  });
});
