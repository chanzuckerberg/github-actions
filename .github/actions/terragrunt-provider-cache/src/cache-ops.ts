import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
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
    return;
  }
  if (operation === 'upload') {
    await upload(bucket, cacheKey, cacheDir);
    return;
  }

  throw new Error(`operation must be "restore" or "upload", got: ${operation}`);
}
