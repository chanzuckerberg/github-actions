import {
  AMD_URL,
  ARM_URL,
  CACHE_KEY_SUFFIX,
  getAwsCliInstallDir,
  getBundleUrlForMachine,
  getCachePrimaryKey,
} from './lib';

describe('getBundleUrlForMachine', () => {
  it('uses aarch64 bundle for arm64 and aarch64', () => {
    expect(getBundleUrlForMachine('arm64')).toBe(ARM_URL);
    expect(getBundleUrlForMachine('aarch64')).toBe(ARM_URL);
  });

  it('uses x86_64 bundle for other architectures', () => {
    expect(getBundleUrlForMachine('x86_64')).toBe(AMD_URL);
    expect(getBundleUrlForMachine('amd64')).toBe(AMD_URL);
  });
});

describe('getCachePrimaryKey', () => {
  it('embeds os, arch, and suffix', () => {
    expect(getCachePrimaryKey('Linux', 'X64')).toBe(
      `aws-cli-exe-Linux-X64-${CACHE_KEY_SUFFIX}`,
    );
  });
});

describe('getAwsCliInstallDir', () => {
  it('appends aws-cli under tool cache root', () => {
    expect(getAwsCliInstallDir('/opt/hostedtoolcache')).toBe(
      '/opt/hostedtoolcache/aws-cli',
    );
  });
});
