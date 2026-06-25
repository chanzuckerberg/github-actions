import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  getAwsCliInstallDir,
  getBundleUrlForMachine,
  getCachePrimaryKey,
} from './lib';

function toolCacheInstallDir(): string {
  const root = process.env.RUNNER_TOOL_CACHE;
  if (!root) {
    throw new Error('RUNNER_TOOL_CACHE is not set');
  }
  return getAwsCliInstallDir(root);
}

function cachePrimaryKey(): string {
  const osName = process.env.RUNNER_OS;
  const arch = process.env.RUNNER_ARCH;
  if (!osName || !arch) {
    throw new Error('RUNNER_OS or RUNNER_ARCH is not set');
  }
  return getCachePrimaryKey(osName, arch);
}

function exportPlatformHint(): void {
  const machine = os.machine();
  if (machine === 'arm64' || machine === 'aarch64') {
    core.exportVariable('PLATFORM', 'linux_arm64');
    return;
  }
  core.exportVariable('PLATFORM', 'linux_ubuntu-latest');
}

function bundleUrl(): string {
  return getBundleUrlForMachine(os.machine());
}

async function installFromOfficialBundle(installRoot: string): Promise<void> {
  const url = bundleUrl();
  core.info('Downloading AWS CLI bundle');
  const zipPath = await tc.downloadTool(url);
  const extracted = await tc.extractZip(zipPath);
  const installScript = path.join(extracted, 'aws', 'install');
  if (!fs.existsSync(installScript)) {
    throw new Error(`AWS CLI install script not found at ${installScript}`);
  }

  const libDir = path.join(installRoot, 'aws-cli');
  const binDir = installRoot;

  core.info(`Running AWS CLI installer -> ${installRoot}`);
  const code = await exec.exec('bash', [
    installScript,
    '-i',
    libDir,
    '-b',
    binDir,
  ]);
  if (code !== 0) {
    throw new Error(`aws/install exited with code ${code}`);
  }

  await io.rmRF(zipPath);
  await io.rmRF(extracted);
}

export async function run(): Promise<void> {
  exportPlatformHint();

  const cacheRoot = toolCacheInstallDir();
  const primaryKey = cachePrimaryKey();

  const restoredKey = await cache.restoreCache([cacheRoot], primaryKey);
  if (restoredKey) {
    core.info('AWS CLI restored from GitHub Actions cache');
    core.addPath(cacheRoot);
    return;
  }

  await io.rmRF(cacheRoot);
  await io.mkdirP(cacheRoot);

  await installFromOfficialBundle(cacheRoot);

  await cache.saveCache([cacheRoot], primaryKey);
  core.addPath(cacheRoot);
}
