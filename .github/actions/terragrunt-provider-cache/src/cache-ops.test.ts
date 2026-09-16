import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createModuleSymlinks,
  restoreStatePath,
  run,
} from './cache-ops';

jest.mock('@actions/core');
jest.mock('@actions/exec', () => ({
  getExecOutput: jest.fn(),
  exec: jest.fn(),
}));

describe('run', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-provider-cache-'));
    jest.mocked(core.getInput).mockReset();
    jest.mocked(core.setFailed).mockImplementation(() => undefined);
    jest.mocked(core.info).mockReset();
    jest.mocked(core.warning).mockReset();
    jest.mocked(exec.exec).mockReset();
    jest.mocked(exec.getExecOutput).mockReset();
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'provider-cache-bucket') return 'bucket';
      if (name === 'provider-cache-key') return 'cache/providers.tar.gz';
      if (name === 'cache-dir') return cacheDir;
      if (name === 'stack-root') return '/missing-stack';
      if (name === 'modules-dir') return '/missing-modules';
      return '';
    });
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(`${cacheDir}.tar.gz`, { force: true });
    fs.rmSync(restoreStatePath(cacheDir), { force: true });
  });

  it('rejects unknown operation', async () => {
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'nope';
      if (name === 'provider-cache-bucket') return 'b';
      if (name === 'provider-cache-key') return 'k';
      if (name === 'cache-dir') return cacheDir;
      return '';
    });

    await expect(run()).rejects.toThrow(
      /operation must be "restore" or "upload"/,
    );
  });

  it('starts with an empty cache when the S3 object is absent', async () => {
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'restore';
      if (name === 'provider-cache-bucket') return 'bucket';
      if (name === 'provider-cache-key') return 'cache/providers.tar.gz';
      if (name === 'cache-dir') return cacheDir;
      if (name === 'stack-root') return '/missing-stack';
      if (name === 'modules-dir') return '/missing-modules';
      return '';
    });
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 254,
      stdout: '',
      stderr: 'An error occurred (404) when calling HeadObject: Not Found',
    });

    await run();

    expect(
      JSON.parse(fs.readFileSync(restoreStatePath(cacheDir), 'utf8')),
    ).toEqual({ baseline: 'EMPTY', sourceETag: null });
  });

  it('does not replace or mark the cache after interrupted extraction', async () => {
    fs.writeFileSync(path.join(cacheDir, 'existing-provider'), 'complete');
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'restore';
      if (name === 'provider-cache-bucket') return 'bucket';
      if (name === 'provider-cache-key') return 'cache/providers.tar.gz';
      if (name === 'cache-dir') return cacheDir;
      if (name === 'stack-root') return '/missing-stack';
      if (name === 'modules-dir') return '/missing-modules';
      return '';
    });
    jest.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: '{"ETag":"\\"etag-1\\""}',
      stderr: '',
    });
    jest.mocked(exec.exec)
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('operation cancelled'));

    await expect(run()).rejects.toThrow('operation cancelled');

    expect(fs.readFileSync(path.join(cacheDir, 'existing-provider'), 'utf8'))
      .toBe('complete');
    expect(fs.existsSync(restoreStatePath(cacheDir))).toBe(false);
  });

  it('skips upload when restore did not complete', async () => {
    fs.writeFileSync(path.join(cacheDir, 'provider'), 'partial');
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'upload';
      if (name === 'provider-cache-bucket') return 'bucket';
      if (name === 'provider-cache-key') return 'cache/providers.tar.gz';
      if (name === 'cache-dir') return cacheDir;
      return '';
    });

    await run();

    expect(core.warning).toHaveBeenCalledWith(
      'Provider cache restore did not complete; skip upload',
    );
    expect(exec.exec).not.toHaveBeenCalled();
  });

  it('does not overwrite a cache changed by another matrix job', async () => {
    fs.writeFileSync(path.join(cacheDir, 'provider'), 'new provider');
    fs.writeFileSync(
      restoreStatePath(cacheDir),
      JSON.stringify({ baseline: 'old-fingerprint', sourceETag: '"etag-1"' }),
    );
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'upload';
      if (name === 'provider-cache-bucket') return 'bucket';
      if (name === 'provider-cache-key') return 'cache/providers.tar.gz';
      if (name === 'cache-dir') return cacheDir;
      return '';
    });
    jest.mocked(exec.exec).mockResolvedValue(0);
    jest.mocked(exec.getExecOutput)
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'PreconditionFailed (412)',
      })
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      'Provider cache changed in S3 since restore; skip stale upload',
    );
    expect(exec.getExecOutput).toHaveBeenNthCalledWith(
      1,
      'aws',
      expect.arrayContaining(['--if-match', '"etag-1"']),
      expect.anything(),
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
