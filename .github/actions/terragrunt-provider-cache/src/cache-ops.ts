import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { fingerprintCacheDir } from './fingerprint';

export const baselinePath = '/tmp/tg-provider-cache.baseline.fp';

const tarPath = '/tmp/providers.tar.gz';

function removeBaseline(): void {
  try {
    fs.unlinkSync(baselinePath);
  } catch {
    /* absent is fine */
  }
}

/**
 * Create symlinks to a shared modules directory in each component dir under a
 * stack root. This works around Terragrunt 1.0.0's 2-level .terragrunt-cache
 * which breaks relative module paths like ../../../modules.
 */
function createModuleSymlinks(stackRoot: string, modulesDir: string): void {
  const modulesAbs = path.resolve(modulesDir);
  if (!fs.existsSync(modulesAbs) || !fs.statSync(modulesAbs).isDirectory()) {
    core.info(`No modules directory at ${modulesAbs}; skipping symlinks`);
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(stackRoot, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const compDir = path.join(stackRoot, ent.name);
    const target = path.join(compDir, 'modules');
    if (!fs.existsSync(target) || fs.lstatSync(target).isSymbolicLink()) {
      fs.symlinkSync(modulesAbs, target, 'dir');
    }
  }
  core.info(`Module symlinks created under ${stackRoot}`);
}

async function restore(
  bucket: string,
  key: string,
  cacheDir: string,
): Promise<void> {
  fs.mkdirSync(cacheDir, { recursive: true });
  removeBaseline();

  const dest = `s3://${bucket}/${key}`;
  const out = await exec.getExecOutput('aws', ['s3', 'cp', dest, tarPath], {
    ignoreReturnCode: true,
    silent: true,
  });

  if (out.exitCode !== 0) {
    core.info('No provider cache found in S3, starting fresh');
    return;
  }

  await exec.exec('tar', ['-xzf', tarPath, '-C', cacheDir]);
  try {
    fs.unlinkSync(tarPath);
  } catch {
    /* best-effort */
  }

  const fp = fingerprintCacheDir(cacheDir);
  fs.writeFileSync(baselinePath, `${fp}\n`, 'utf8');
  core.info('Provider cache restored from S3 (baseline fingerprint recorded)');
}

async function upload(
  bucket: string,
  key: string,
  cacheDir: string,
): Promise<void> {
  if (!fs.existsSync(cacheDir) || !fs.statSync(cacheDir).isDirectory()) {
    core.info('No provider cache directory; skip upload');
    return;
  }

  const current = fingerprintCacheDir(cacheDir);
  if (current === 'EMPTY') {
    core.info('No provider cache to upload');
    return;
  }

  if (fs.existsSync(baselinePath)) {
    const previous = fs.readFileSync(baselinePath, 'utf8').trim();
    if (current === previous) {
      core.info(
        'Provider cache unchanged since restore (fingerprint match); skip S3 upload',
      );
      return;
    }
  }

  await exec.exec('tar', ['-czf', tarPath, '-C', cacheDir, '.']);
  await exec.exec('aws', [
    's3',
    'cp',
    tarPath,
    `s3://${bucket}/${key}`,
    '--sse',
    'AES256',
  ]);
  try {
    fs.unlinkSync(tarPath);
  } catch {
    /* best-effort */
  }
  core.info('Provider cache uploaded to S3');
}

export async function run(): Promise<void> {
  const operation = core.getInput('operation', { required: true }).toLowerCase();
  const bucket = core.getInput('provider-cache-bucket', { required: true });
  const cacheKey = core.getInput('provider-cache-key', { required: true });
  const cacheDir = core.getInput('cache-dir', { required: true });

  if (operation === 'restore') {
    await restore(bucket, cacheKey, cacheDir);

    const stackRoot = core.getInput('stack-root', { required: true });
    const modulesDir = core.getInput('modules-dir');
    const absStack = path.resolve(process.env.GITHUB_WORKSPACE!, stackRoot);
    const absMods = path.resolve(process.env.GITHUB_WORKSPACE!, modulesDir);
    createModuleSymlinks(absStack, absMods);
    return;
  }
  if (operation === 'upload') {
    await upload(bucket, cacheKey, cacheDir);
    return;
  }

  throw new Error(`operation must be "restore" or "upload", got: ${operation}`);
}
