import * as path from 'path';

export const AMD_URL = 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip';
export const ARM_URL = 'https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip';

/** Bump when the unversioned awscli-exe bundle should be re-fetched. */
export const CACHE_KEY_SUFFIX = 'v1';

export function getBundleUrlForMachine(machine: string): string {
  if (machine === 'arm64' || machine === 'aarch64') {
    return ARM_URL;
  }
  return AMD_URL;
}

export function getCachePrimaryKey(
  runnerOS: string,
  runnerArch: string,
): string {
  return `aws-cli-exe-${runnerOS}-${runnerArch}-${CACHE_KEY_SUFFIX}`;
}

export function getAwsCliInstallDir(runnerToolCache: string): string {
  return path.join(runnerToolCache, 'aws-cli');
}
