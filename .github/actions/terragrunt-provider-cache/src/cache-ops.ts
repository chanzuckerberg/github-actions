import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { fingerprintCacheDir } from './fingerprint';

interface RestoreState {
  baseline: string;
  sourceETag: string | null;
}

function archivePath(cacheDir: string): string {
  return `${cacheDir}.tar.gz`;
}

export function restoreStatePath(cacheDir: string): string {
  return `${cacheDir}.restore-state.json`;
}

function removeRestoreState(cacheDir: string): void {
  fs.rmSync(restoreStatePath(cacheDir), { force: true });
}

function writeRestoreState(cacheDir: string, state: RestoreState): void {
  fs.writeFileSync(restoreStatePath(cacheDir), JSON.stringify(state), 'utf8');
}

function readRestoreState(cacheDir: string): RestoreState | null {
  try {
    return JSON.parse(
      fs.readFileSync(restoreStatePath(cacheDir), 'utf8'),
    ) as RestoreState;
  } catch {
    return null;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function statusCode(err: unknown): number | undefined {
  return (err as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata?.httpStatusCode;
}

function isNotFound(err: unknown): boolean {
  return statusCode(err) === 404
    || (err instanceof Error && ['NotFound', 'NoSuchKey'].includes(err.name));
}

function isPreconditionFailed(err: unknown): boolean {
  return statusCode(err) === 412
    || (err instanceof Error && err.name === 'PreconditionFailed');
}

function replaceDirectory(stagingDir: string, cacheDir: string): void {
  const backupDir = `${cacheDir}.previous-${randomUUID()}`;
  const hadCache = fs.existsSync(cacheDir);

  if (hadCache) {
    fs.renameSync(cacheDir, backupDir);
  }

  try {
    fs.renameSync(stagingDir, cacheDir);
  } catch (err) {
    if (hadCache) {
      fs.renameSync(backupDir, cacheDir);
    }
    throw err;
  }

  fs.rmSync(backupDir, { recursive: true, force: true });
}

function isUnit(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'terragrunt.hcl'));
}

/**
 * Paths a unit's relative module source resolves to once Terragrunt has copied
 * the unit into .terragrunt-cache/<hash>/<hash>. Config runs three levels below
 * the unit there, so a source with three .. segments lands on the unit dir and
 * one with two lands on .terragrunt-cache. Env components are three deep and
 * use the former, account stacks are two deep and use the latter.
 */
function moduleLinkPaths(unitDir: string): string[] {
  return [
    path.join(unitDir, 'modules'),
    path.join(unitDir, '.terragrunt-cache', 'modules'),
  ];
}

function linkModules(target: string, modulesAbs: string): void {
  let existing: fs.Stats | undefined;
  try {
    existing = fs.lstatSync(target);
  } catch {
    /* absent is the normal case */
  }
  if (existing && !existing.isSymbolicLink()) {
    return;
  }
  if (existing) {
    fs.unlinkSync(target);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(modulesAbs, target, 'dir');
}

/**
 * Create symlinks to a shared modules directory for every unit in a stack, so
 * relative module paths still resolve after Terragrunt 1.0.0 copies each unit
 * into .terragrunt-cache. The stack root counts as a unit itself, which is how
 * account stacks are laid out.
 */
export function createModuleSymlinks(stackRoot: string, modulesDir: string): void {
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

  const unitDirs = [stackRoot]
    .concat(
      entries
        .filter((ent) => ent.isDirectory())
        .map((ent) => path.join(stackRoot, ent.name)),
    )
    .filter(isUnit);

  for (const unitDir of unitDirs) {
    for (const target of moduleLinkPaths(unitDir)) {
      linkModules(target, modulesAbs);
    }
  }
  core.info(`Module symlinks created for ${unitDirs.length} unit(s) under ${stackRoot}`);
}

async function restore(
  s3: S3Client,
  bucket: string,
  key: string,
  cacheDir: string,
): Promise<void> {
  const tarPath = archivePath(cacheDir);
  const stagingDir = `${cacheDir}.restore-${randomUUID()}`;
  removeRestoreState(cacheDir);

  let response: GetObjectCommandOutput;
  try {
    response = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
  } catch (err) {
    if (isNotFound(err)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
      writeRestoreState(cacheDir, { baseline: 'EMPTY', sourceETag: null });
      core.info('No provider cache found in S3, starting fresh');
      return;
    }
    throw new Error(`download provider cache from S3: ${errorMessage(err)}`);
  }
  if (!response.ETag) {
    throw new Error('download provider cache from S3: response had no ETag');
  }
  if (!response.Body) {
    throw new Error('download provider cache from S3: response had no body');
  }

  try {
    await pipeline(response.Body as Readable, fs.createWriteStream(tarPath));
    fs.mkdirSync(stagingDir, { recursive: true });
    await exec.exec('tar', ['-xzf', tarPath, '-C', stagingDir]);

    const baseline = fingerprintCacheDir(stagingDir);
    replaceDirectory(stagingDir, cacheDir);
    writeRestoreState(cacheDir, {
      baseline,
      sourceETag: response.ETag,
    });
    core.info('Provider cache restored from S3 (baseline fingerprint recorded)');
  } finally {
    fs.rmSync(tarPath, { force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

async function upload(
  s3: S3Client,
  bucket: string,
  key: string,
  cacheDir: string,
): Promise<void> {
  const restoreState = readRestoreState(cacheDir);
  if (!restoreState) {
    core.warning('Provider cache restore did not complete; skip upload');
    return;
  }

  if (!fs.existsSync(cacheDir) || !fs.statSync(cacheDir).isDirectory()) {
    core.info('No provider cache directory; skip upload');
    return;
  }

  const current = fingerprintCacheDir(cacheDir);
  if (current === 'EMPTY') {
    core.info('No provider cache to upload');
    return;
  }

  if (current === restoreState.baseline) {
    core.info(
      'Provider cache unchanged since restore (fingerprint match); skip S3 upload',
    );
    return;
  }

  const tarPath = archivePath(cacheDir);
  const stagingKey = `${key}.uploads/${randomUUID()}.tar.gz`;

  try {
    await exec.exec('tar', ['-czf', tarPath, '-C', cacheDir, '.']);
    const stagingUpload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: stagingKey,
        Body: fs.createReadStream(tarPath),
        ServerSideEncryption: 'AES256',
      },
    });
    await stagingUpload.done();

    try {
      await s3.send(new CopyObjectCommand({
        Bucket: bucket,
        Key: key,
        CopySource: `${bucket}/${stagingKey}`,
        ServerSideEncryption: 'AES256',
        IfMatch: restoreState.sourceETag ?? undefined,
        IfNoneMatch: restoreState.sourceETag ? undefined : '*',
      }));
    } catch (err) {
      if (isPreconditionFailed(err)) {
        core.info('Provider cache changed in S3 since restore; skip stale upload');
        return;
      }
      throw new Error(`promote provider cache in S3: ${errorMessage(err)}`);
    }

    core.info('Provider cache uploaded to S3');
  } finally {
    fs.rmSync(tarPath, { force: true });
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: stagingKey,
      }));
    } catch (err) {
      core.warning(`delete staged provider cache from S3: ${errorMessage(err)}`);
    }
  }
}

export async function run(): Promise<void> {
  const operation = core.getInput('operation', { required: true }).toLowerCase();
  const bucket = core.getInput('provider-cache-bucket', { required: true });
  const cacheKey = core.getInput('provider-cache-key', { required: true });
  const cacheDir = core.getInput('cache-dir', { required: true });
  const s3 = new S3Client({});

  if (operation === 'restore') {
    await restore(s3, bucket, cacheKey, cacheDir);

    const stackRoot = core.getInput('stack-root', { required: true });
    const modulesDir = core.getInput('modules-dir');
    const absStack = path.resolve(process.env.GITHUB_WORKSPACE!, stackRoot);
    const absMods = path.resolve(process.env.GITHUB_WORKSPACE!, modulesDir);
    createModuleSymlinks(absStack, absMods);
    return;
  }
  if (operation === 'upload') {
    await upload(s3, bucket, cacheKey, cacheDir);
    return;
  }

  throw new Error(`operation must be "restore" or "upload", got: ${operation}`);
}
