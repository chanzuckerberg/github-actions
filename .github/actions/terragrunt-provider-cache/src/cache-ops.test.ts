import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createModuleSymlinks, run } from './cache-ops';

jest.mock('@actions/core');
jest.mock('@actions/exec', () => ({
  getExecOutput: jest.fn(),
  exec: jest.fn(),
}));

describe('run', () => {
  beforeEach(() => {
    jest.mocked(core.getInput).mockReset();
    jest.mocked(core.setFailed).mockImplementation(() => undefined);
  });

  it('rejects unknown operation', async () => {
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'nope';
      if (name === 'provider-cache-bucket') return 'b';
      if (name === 'provider-cache-key') return 'k';
      if (name === 'cache-dir') return '/tmp/c';
      return '';
    });

    await expect(run()).rejects.toThrow(
      /operation must be "restore" or "upload"/,
    );
  });
});

describe('createModuleSymlinks', () => {
  let repo: string;
  let modulesDir: string;

  const makeUnit = (dir: string): string => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'terragrunt.hcl'), '');
    return dir;
  };

  const linkTarget = (p: string): string => fs.realpathSync(p);

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-symlink-'));
    modulesDir = path.join(repo, 'terraform', 'modules');
    fs.mkdirSync(path.join(modulesDir, 'aws-env'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it('links both depths for an account stack, where the stack root is the unit', () => {
    const stackRoot = makeUnit(path.join(repo, 'terraform', 'accounts', 'czi-si'));

    createModuleSymlinks(stackRoot, modulesDir);

    expect(linkTarget(path.join(stackRoot, 'modules'))).toBe(
      fs.realpathSync(modulesDir),
    );
    expect(
      linkTarget(path.join(stackRoot, '.terragrunt-cache', 'modules')),
    ).toBe(fs.realpathSync(modulesDir));
  });

  it('links each component of an env stack', () => {
    const stackRoot = path.join(repo, 'terraform', 'envs', 'dev');
    const eks = makeUnit(path.join(stackRoot, 'eks'));
    const ingress = makeUnit(path.join(stackRoot, 'ingress'));

    createModuleSymlinks(stackRoot, modulesDir);

    for (const unit of [eks, ingress]) {
      expect(linkTarget(path.join(unit, 'modules'))).toBe(
        fs.realpathSync(modulesDir),
      );
    }
  });

  it('skips directories that are not units', () => {
    const stackRoot = path.join(repo, 'terraform', 'envs', 'dev');
    makeUnit(path.join(stackRoot, 'eks'));
    const notAUnit = path.join(stackRoot, 'dashboards');
    fs.mkdirSync(notAUnit, { recursive: true });

    createModuleSymlinks(stackRoot, modulesDir);

    expect(fs.existsSync(path.join(notAUnit, 'modules'))).toBe(false);
  });

  it('leaves a real modules directory alone', () => {
    const stackRoot = makeUnit(path.join(repo, 'terraform', 'accounts', 'czi-si'));
    const real = path.join(stackRoot, 'modules');
    fs.mkdirSync(real);

    createModuleSymlinks(stackRoot, modulesDir);

    expect(fs.lstatSync(real).isSymbolicLink()).toBe(false);
  });

  it('is safe to run twice', () => {
    const stackRoot = makeUnit(path.join(repo, 'terraform', 'accounts', 'czi-si'));

    createModuleSymlinks(stackRoot, modulesDir);
    expect(() => createModuleSymlinks(stackRoot, modulesDir)).not.toThrow();

    expect(linkTarget(path.join(stackRoot, 'modules'))).toBe(
      fs.realpathSync(modulesDir),
    );
  });

  it('does nothing when the modules directory is missing', () => {
    const stackRoot = makeUnit(path.join(repo, 'terraform', 'accounts', 'czi-si'));

    createModuleSymlinks(stackRoot, path.join(repo, 'terraform', 'nope'));

    expect(fs.existsSync(path.join(stackRoot, 'modules'))).toBe(false);
  });
});
