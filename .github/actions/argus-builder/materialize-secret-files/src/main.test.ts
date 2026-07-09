import * as path from 'path';
import {
  resolveSecret,
  materializeSpec,
  materializeAll,
  SecretFileSpec,
} from './main';

jest.mock('@actions/core');

const fullEnv: Record<string, string> = {
  SECRET_GITHUB_TOKEN: 'ghs_token',
  SECRET_NPM_TOKEN: 'npm_secret',
  SECRET_PYPI_TOKEN: 'pypi_secret',
};

const emptyEnv: Record<string, string> = {
  SECRET_GITHUB_TOKEN: 'ghs_token',
  SECRET_NPM_TOKEN: '',
};

// ---- resolveSecret ----------------------------------------------------------

describe('resolveSecret', () => {
  it('returns the value for a set secret', () => {
    expect(resolveSecret('NPM_TOKEN', fullEnv)).toBe('npm_secret');
  });

  it('returns empty string for GITHUB_TOKEN even when empty', () => {
    expect(resolveSecret('GITHUB_TOKEN', { SECRET_GITHUB_TOKEN: '' })).toBe('');
  });

  it('returns the GITHUB_TOKEN value when set', () => {
    expect(resolveSecret('GITHUB_TOKEN', fullEnv)).toBe('ghs_token');
  });

  it('throws when a non-GITHUB_TOKEN secret is empty', () => {
    expect(() => resolveSecret('NPM_TOKEN', emptyEnv)).toThrow("'NPM_TOKEN' is not available");
  });

  it('throws when the env var is absent entirely', () => {
    expect(() => resolveSecret('PYPI_TOKEN', {})).toThrow("'PYPI_TOKEN' is not available");
  });
});

// ---- materializeSpec --------------------------------------------------------

describe('materializeSpec', () => {
  const written: Array<{ path: string; content: string }> = [];
  const writeFile = (p: string, c: string) => { written.push({ path: p, content: c }); };
  const opts = {
    secretsDir: '/tmp/test-secrets',
    env: fullEnv,
    writeFile,
  };

  beforeEach(() => { written.length = 0; });

  describe('type: path', () => {
    it('returns id=<repoName>/<path> without writing any file', () => {
      const spec: SecretFileSpec = {
        id: 'npmrc', type: 'path', path: '.npmrc.template',
      };
      const result = materializeSpec(spec, 'frontend', 'my-repo', opts);
      expect(result).toBe(`npmrc=${path.join('my-repo', '.npmrc.template')}`);
      expect(written).toHaveLength(0);
    });

    it('uses path.join so the result is OS-normalised', () => {
      const spec: SecretFileSpec = {
        id: 'f', type: 'path', path: 'a/b',
      };
      const result = materializeSpec(spec, 'img', 'repo', opts);
      expect(result).toBe(`f=${path.join('repo', 'a/b')}`);
    });

    it('ignores context field from old CLI for backward compatibility', () => {
      const spec: SecretFileSpec = {
        id: 'f', type: 'path', path: 'a/b', context: './old-context',
      };
      const result = materializeSpec(spec, 'img', 'repo', opts);
      expect(result).toBe(`f=${path.join('repo', 'a/b')}`);
    });
  });

  describe('type: raw', () => {
    it('writes the secret value to a namespaced temp file and returns the path', () => {
      const spec: SecretFileSpec = { id: 'tok', type: 'raw', from_secret: 'NPM_TOKEN' };
      const result = materializeSpec(spec, 'frontend', 'my-repo', opts);
      const expectedPath = '/tmp/test-secrets/frontend__tok';
      expect(result).toBe(`tok=${expectedPath}`);
      expect(written).toEqual([{ path: expectedPath, content: 'npm_secret' }]);
    });

    it('throws when the secret is not available', () => {
      const spec: SecretFileSpec = { id: 'tok', type: 'raw', from_secret: 'NPM_TOKEN' };
      expect(() => materializeSpec(spec, 'img', 'repo', { ...opts, env: emptyEnv }))
        .toThrow("'NPM_TOKEN' is not available");
    });
  });

  describe('type: template', () => {
    // Template strings use ${NAME} syntax. We build them via string concat so
    // they are not interpreted as JS template literals by the linter.
    const ghPlaceholder = '${GITHUB_TOKEN}'; // eslint-disable-line no-template-curly-in-string
    const npmPlaceholder = '${NPM_TOKEN}'; // eslint-disable-line no-template-curly-in-string
    const escapedPlaceholder = '$${NOT_REPLACED}'; // eslint-disable-line no-template-curly-in-string
    const literalResult = '${NOT_REPLACED}'; // eslint-disable-line no-template-curly-in-string

    it('substitutes placeholders with resolved secret values', () => {
      const template = `//npm.pkg.github.com/:_authToken=${ghPlaceholder}\n//registry.npmjs.org/:_authToken=${npmPlaceholder}`;
      const spec: SecretFileSpec = {
        id: 'npmrc',
        type: 'template',
        from_secret: ['GITHUB_TOKEN', 'NPM_TOKEN'],
        template,
      };
      const result = materializeSpec(spec, 'frontend', 'my-repo', opts);
      const expectedPath = '/tmp/test-secrets/frontend__npmrc';
      expect(result).toBe(`npmrc=${expectedPath}`);
      expect(written).toHaveLength(1);
      expect(written[0].content).toBe(
        '//npm.pkg.github.com/:_authToken=ghs_token\n//registry.npmjs.org/:_authToken=npm_secret',
      );
    });

    it('replaces escaped $$NAME with a literal placeholder', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const template = `token=${ghPlaceholder}\nliteral=${escapedPlaceholder}`;
      const spec: SecretFileSpec = {
        id: 'conf',
        type: 'template',
        from_secret: ['GITHUB_TOKEN'],
        template,
      };
      materializeSpec(spec, 'img', 'repo', opts);
      expect(written[0].content).toBe(`token=ghs_token\nliteral=${literalResult}`);
    });

    it('throws when a required secret is unavailable', () => {
      const spec: SecretFileSpec = {
        id: 'npmrc',
        type: 'template',
        from_secret: ['NPM_TOKEN'],
        template: `//registry/:_authToken=${npmPlaceholder}`,
      };
      expect(() => materializeSpec(spec, 'img', 'repo', { ...opts, env: emptyEnv }))
        .toThrow("'NPM_TOKEN' is not available");
    });
  });

  it('throws for an unknown spec type', () => {
    const spec = { id: 'x', type: 'unknown' } as unknown as SecretFileSpec;
    expect(() => materializeSpec(spec, 'img', 'repo', opts))
      .toThrow('Unknown secret_files spec type: unknown');
  });
});

// ---- materializeAll ---------------------------------------------------------

describe('materializeAll', () => {
  const written: Array<{ path: string; content: string }> = [];
  const writeFile = (p: string, c: string) => { written.push({ path: p, content: c }); };
  const opts = {
    secretsDir: '/tmp/test-secrets',
    env: fullEnv,
    writeFile,
  };

  beforeEach(() => { written.length = 0; });

  it('returns empty string when specs is empty', () => {
    expect(materializeAll([], 'img', 'repo', opts)).toBe('');
    expect(written).toHaveLength(0);
  });

  it('joins multiple spec results with newlines', () => {
    const specs: SecretFileSpec[] = [
      {
        id: 'a', type: 'path', path: '.file',
      },
      { id: 'b', type: 'raw', from_secret: 'NPM_TOKEN' },
    ];
    const result = materializeAll(specs, 'frontend', 'my-repo', opts);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^a=/);
    expect(lines[1]).toBe('b=/tmp/test-secrets/frontend__b');
  });

  it('propagates errors from materializeSpec', () => {
    const specs: SecretFileSpec[] = [
      { id: 'tok', type: 'raw', from_secret: 'NPM_TOKEN' },
    ];
    expect(() => materializeAll(specs, 'img', 'repo', { ...opts, env: emptyEnv }))
      .toThrow("'NPM_TOKEN' is not available");
  });
});
