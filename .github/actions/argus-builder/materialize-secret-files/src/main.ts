import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

// ---- Types ------------------------------------------------------------------

// Wire format produced by Go SecretFileMatrixSpec in core/shared/go/ci/matrix.go.
// Keep in sync when adding new spec types.
export type SecretFileSpec =
  | { id: string; type: 'path'; path: string }
  | { id: string; type: 'raw'; from_secret: string }
  | { id: string; type: 'template'; from_secret: string[]; template: string };

// ---- Secret resolution ------------------------------------------------------

// resolveSecret returns the value of a SECRET_<name> env var, masking it in
// logs. Throws if the value is empty for any secret other than GITHUB_TOKEN
// (which is always available via the workflow permissions block).
export function resolveSecret(
  secretName: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env[`SECRET_${secretName}`];
  if (value === undefined || (value === '' && secretName !== 'GITHUB_TOKEN')) {
    throw new Error(
      `Secret '${secretName}' is not available. ` // eslint-disable-line @typescript-eslint/quotes
      + 'Set it in the repo\'s Actions settings or remove the reference from .argus-ci.yaml.',
    );
  }
  core.setSecret(value);
  return value;
}

// ---- Materialization --------------------------------------------------------

export type MaterializeOptions = {
  secretsDir?: string;
  env?: Record<string, string | undefined>;
  writeFile?: (filePath: string, content: string) => void;
};

// materializeSpec writes a single secret file spec to disk (or returns the
// path for literal 'path' specs) and returns an "id=path" pair.
export function materializeSpec(
  spec: SecretFileSpec,
  imageName: string,
  repoName: string,
  opts: MaterializeOptions = {},
): string {
  const {
    secretsDir = '/tmp/argus-secrets',
    env = process.env,
    writeFile = defaultWriteFile,
  } = opts;

  if (spec.type === 'path') {
    // Literal file path relative to the repo root. The docker-build action
    // checks out the repo to <repo-name>/, so we prefix with that.
    return `${spec.id}=${path.join(repoName, spec.path)}`;
  }

  if (spec.type === 'raw') {
    const value = resolveSecret(spec.from_secret, env);
    const filePath = path.join(secretsDir, `${imageName}__${spec.id}`);
    writeFile(filePath, value);
    return `${spec.id}=${filePath}`;
  }

  if (spec.type === 'template') {
    const resolved: Record<string, string> = spec.from_secret.reduce<Record<string, string>>(
      (acc, name) => ({ ...acc, [name]: resolveSecret(name, env) }),
      {},
    );
    const content = spec.template
      .replace(/(?<!\$)\$\{([A-Z0-9_]+)\}/g, (_, name) => resolved[name])
      .replace(/\$\$/g, '$');
    core.setSecret(content);
    const filePath = path.join(secretsDir, `${imageName}__${spec.id}`);
    writeFile(filePath, content);
    return `${spec.id}=${filePath}`;
  }

  throw new Error(`Unknown secret_files spec type: ${(spec as SecretFileSpec).type}`);
}

// materializeAll processes every spec and returns a newline-separated
// id=path string, or an empty string when specs is empty.
export function materializeAll(
  specs: SecretFileSpec[],
  imageName: string,
  repoName: string,
  opts: MaterializeOptions = {},
): string {
  if (specs.length === 0) return '';

  const { secretsDir = '/tmp/argus-secrets', writeFile = defaultWriteFile } = opts;

  fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });

  const lines = specs.map((spec) => materializeSpec(spec, imageName, repoName, { ...opts, secretsDir, writeFile }));
  return lines.join('\n');
}

function defaultWriteFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

// ---- Entrypoint -------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  main();
}

export function main(): void {
  const specJson = core.getInput('secret_files_spec', { required: true });
  const imageName = core.getInput('image_name', { required: true });
  const repoName = core.getInput('repo_name', { required: true });

  let specs: SecretFileSpec[];
  try {
    specs = JSON.parse(specJson) as SecretFileSpec[];
  } catch (e) {
    core.setFailed(`Failed to parse secret_files_spec: ${e}`);
    return;
  }

  try {
    const secretFiles = materializeAll(specs, imageName, repoName);
    core.setOutput('secret_files', secretFiles);
  } catch (e) {
    core.setFailed(`${e}`);
  }
}
