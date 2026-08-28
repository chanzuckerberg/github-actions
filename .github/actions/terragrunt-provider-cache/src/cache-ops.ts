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
