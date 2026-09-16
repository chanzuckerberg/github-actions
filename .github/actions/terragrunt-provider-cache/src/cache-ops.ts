import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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

function isNotFound(out: exec.ExecOutput): boolean {
  return /\b404\b|NoSuchKey|Not Found/i.test(`${out.stdout}\n${out.stderr}`);
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
  bucket: string,
  key: string,
  cacheDir: string,
): Promise<void> {
  const tarPath = archivePath(cacheDir);
  const stagingDir = `${cacheDir}.restore-${randomUUID()}`;
  removeRestoreState(cacheDir);

  const head = await exec.getExecOutput('aws', [
    's3api',
    'head-object',
    '--bucket',
    bucket,
    '--key',
    key,
  ], {
    ignoreReturnCode: true,
    silent: true,
  });

  if (head.exitCode !== 0 && isNotFound(head)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    writeRestoreState(cacheDir, { baseline: 'EMPTY', sourceETag: null });
    core.info('No provider cache found in S3, starting fresh');
    return;
  }
  if (head.exitCode !== 0) {
    throw new Error(`inspect provider cache in S3: ${head.stderr.trim()}`);
  }

  try {
    const metadata = JSON.parse(head.stdout) as { ETag?: string };
    if (!metadata.ETag) {
      throw new Error('inspect provider cache in S3: response did not include ETag');
    }

    await exec.exec('aws', ['s3', 'cp', `s3://${bucket}/${key}`, tarPath]);
    fs.mkdirSync(stagingDir, { recursive: true });
    await exec.exec('tar', ['-xzf', tarPath, '-C', stagingDir]);

    const baseline = fingerprintCacheDir(stagingDir);
    replaceDirectory(stagingDir, cacheDir);
    writeRestoreState(cacheDir, {
      baseline,
      sourceETag: metadata.ETag,
    });
    core.info('Provider cache restored from S3 (baseline fingerprint recorded)');
  } finally {
    fs.rmSync(tarPath, { force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

async function upload(
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
    await exec.exec('aws', [
      's3',
      'cp',
      tarPath,
      `s3://${bucket}/${stagingKey}`,
      '--sse',
      'AES256',
    ]);

    const promoteArgs = [
      's3api',
      'copy-object',
      '--bucket',
      bucket,
      '--key',
      key,
      '--copy-source',
      `${bucket}/${stagingKey}`,
      '--server-side-encryption',
      'AES256',
    ];
    if (restoreState.sourceETag) {
      promoteArgs.push('--if-match', restoreState.sourceETag);
    } else {
      promoteArgs.push('--if-none-match', '*');
    }

    const promoted = await exec.getExecOutput('aws', promoteArgs, {
      ignoreReturnCode: true,
      silent: true,
    });
    if (promoted.exitCode !== 0 && /\b412\b|PreconditionFailed/i.test(promoted.stderr)) {
      core.info('Provider cache changed in S3 since restore; skip stale upload');
      return;
    }
    if (promoted.exitCode !== 0) {
      throw new Error(`promote provider cache in S3: ${promoted.stderr.trim()}`);
    }

    core.info('Provider cache uploaded to S3');
  } finally {
    fs.rmSync(tarPath, { force: true });
    await exec.getExecOutput('aws', [
      's3api',
      'delete-object',
      '--bucket',
      bucket,
      '--key',
      stagingKey,
    ], {
      ignoreReturnCode: true,
      silent: true,
    });
  }
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
