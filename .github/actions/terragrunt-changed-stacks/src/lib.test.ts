import {
  enumerateStacks,
  extractChangedModules,
  findDependentStacks,
  parseBases,
  stackDependsOnModules,
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

  it('maps a file in a named stack to that stack', () => {
    expect(stackForFile('terraform/global/main.tf', bases, ['terraform/global'])).toBe(
      'terraform/global',
    );
  });

  it('maps the named stack directory itself', () => {
    expect(stackForFile('terraform/global', bases, ['terraform/global'])).toBe('terraform/global');
  });

  it('prefers a named stack over base-path depth when it sits under a base', () => {
    expect(
      stackForFile('terraform/envs/global/thing/main.tf', bases, ['terraform/envs/global']),
    ).toBe('terraform/envs/global');
  });

  it('does not false-match a named stack on a partial directory name', () => {
    expect(stackForFile('terraform/global-extra/main.tf', bases, ['terraform/global'])).toBeNull();
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

  it('includes a named stack alongside discovered ones', () => {
    const files = ['terraform/envs/dev/eks/main.tf', 'terraform/global/main.tf'];
    expect(stacksFromChangedFiles(files, ['terraform/envs'], ['terraform/global'])).toEqual([
      'terraform/envs/dev',
      'terraform/global',
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

  it('appends named stacks that exist', () => {
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs') return ['dev'];
      if (dir === 'terraform/global') return ['main.tf'];
      return null;
    };
    expect(enumerateStacks(['terraform/envs'], listDir, ['terraform/global'])).toEqual([
      'terraform/envs/dev',
      'terraform/global',
    ]);
  });

  it('skips a named stack that does not exist', () => {
    const listDir = (dir: string): string[] | null => (dir === 'terraform/envs' ? ['dev'] : null);
    expect(enumerateStacks(['terraform/envs'], listDir, ['terraform/global'])).toEqual([
      'terraform/envs/dev',
    ]);
  });
});

describe('extractChangedModules', () => {
  it('extracts module names from changed files under trigger paths', () => {
    const files = [
      'terraform/modules/vpc/main.tf',
      'terraform/modules/eks/variables.tf',
      'terraform/envs/dev/eks/main.tf',
    ];
    expect(extractChangedModules(files, ['terraform/modules'])).toEqual(['vpc', 'eks']);
  });

  it('returns empty when no files match trigger paths', () => {
    const files = ['terraform/envs/dev/eks/main.tf', 'docs/x.md'];
    expect(extractChangedModules(files, ['terraform/modules'])).toEqual([]);
  });

  it('returns empty when trigger paths are empty', () => {
    const files = ['terraform/modules/vpc/main.tf'];
    expect(extractChangedModules(files, [])).toEqual([]);
  });

  it('deduplicates modules across multiple files', () => {
    const files = [
      'terraform/modules/vpc/main.tf',
      'terraform/modules/vpc/variables.tf',
    ];
    expect(extractChangedModules(files, ['terraform/modules'])).toEqual(['vpc']);
  });

  it('does not false-match on a path prefix that is not a directory boundary', () => {
    const files = ['terraform/modules-extra/foo/main.tf'];
    expect(extractChangedModules(files, ['terraform/modules'])).toEqual([]);
  });
});

describe('stackDependsOnModules', () => {
  const tfContent = 'module "vpc" {\n  source = "../../../modules/vpc"\n}';
  const unrelatedContent = 'module "eks" {\n  source = "git@github.com:org/cztack//aws-eks-cluster?ref=v8"\n}';

  it('returns true when a .tf file references a changed module', () => {
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs/dev') return ['cloud-env'];
      if (dir === 'terraform/envs/dev/cloud-env') return ['main.tf'];
      return null;
    };
    const readFile = (p: string): string | null => (p === 'terraform/envs/dev/cloud-env/main.tf' ? tfContent : null);

    expect(stackDependsOnModules('terraform/envs/dev', ['vpc'], listDir, readFile)).toBe(true);
  });

  it('returns false when no .tf file references the changed module', () => {
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs/dev') return ['eks'];
      if (dir === 'terraform/envs/dev/eks') return ['main.tf'];
      return null;
    };
    const readFile = (p: string): string | null => (p === 'terraform/envs/dev/eks/main.tf' ? unrelatedContent : null);

    expect(stackDependsOnModules('terraform/envs/dev', ['vpc'], listDir, readFile)).toBe(false);
  });

  it('scans .tf files in the stack root directory too', () => {
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs/dev') return ['main.tf'];
      return null;
    };
    const readFile = (p: string): string | null => (p === 'terraform/envs/dev/main.tf' ? tfContent : null);

    expect(stackDependsOnModules('terraform/envs/dev', ['vpc'], listDir, readFile)).toBe(true);
  });

  it('ignores non-.tf files', () => {
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs/dev') return ['comp'];
      if (dir === 'terraform/envs/dev/comp') return ['README.md', 'main.tf'];
      return null;
    };
    const readFile = (p: string): string | null => {
      if (p === 'terraform/envs/dev/comp/main.tf') return unrelatedContent;
      if (p === 'terraform/envs/dev/comp/README.md') return 'modules/vpc';
      return null;
    };

    expect(stackDependsOnModules('terraform/envs/dev', ['vpc'], listDir, readFile)).toBe(false);
  });
});

describe('findDependentStacks', () => {
  it('returns only stacks that reference the changed modules', () => {
    const stacks = ['terraform/envs/dev', 'terraform/envs/prod', 'terraform/envs/staging'];
    const listDir = (dir: string): string[] | null => {
      if (dir === 'terraform/envs/dev') return ['cloud-env'];
      if (dir === 'terraform/envs/dev/cloud-env') return ['main.tf'];
      if (dir === 'terraform/envs/prod') return ['cloud-env'];
      if (dir === 'terraform/envs/prod/cloud-env') return ['main.tf'];
      if (dir === 'terraform/envs/staging') return ['eks'];
      if (dir === 'terraform/envs/staging/eks') return ['main.tf'];
      return null;
    };
    const readFile = (p: string): string | null => {
      if (p.includes('dev') || p.includes('prod')) return 'module "vpc" {\n  source = "../../../modules/vpc"\n}';
      return 'module "eks" {\n  source = "git@github.com:org/cztack//aws-eks-cluster"\n}';
    };

    expect(findDependentStacks(stacks, ['vpc'], listDir, readFile)).toEqual([
      'terraform/envs/dev',
      'terraform/envs/prod',
    ]);
  });
});
