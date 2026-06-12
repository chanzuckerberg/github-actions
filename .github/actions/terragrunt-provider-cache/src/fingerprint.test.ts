import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { collectRegularFiles, fingerprintCacheDir } from './fingerprint';

const tmpDirs: string[] = [];

function mkTmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-fp-'));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmpDirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe('fingerprintCacheDir', () => {
  it('returns EMPTY for an empty directory', () => {
    const dir = mkTmp();
    expect(fingerprintCacheDir(dir)).toBe('EMPTY');
  });

  it('throws when path is not a directory', () => {
    const dir = mkTmp();
    const file = path.join(dir, 'f');
    fs.writeFileSync(file, 'x');
    expect(() => fingerprintCacheDir(file)).toThrow(/Not a directory/);
  });

  it('is stable for the same tree', () => {
    const dir = mkTmp();
    fs.mkdirSync(path.join(dir, 'a'));
    fs.writeFileSync(path.join(dir, 'a', 'x.txt'), 'hello');
    const a = fingerprintCacheDir(dir);
    const b = fingerprintCacheDir(dir);
    expect(a).toBe(b);
    expect(a).not.toBe('EMPTY');
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when file content changes', () => {
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'f'), 'v1');
    const h1 = fingerprintCacheDir(dir);
    fs.writeFileSync(path.join(dir, 'f'), 'v2');
    const h2 = fingerprintCacheDir(dir);
    expect(h1).not.toBe(h2);
  });

  it('ignores sort order in filesystem listing (sorts paths)', () => {
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'b'), '2');
    fs.writeFileSync(path.join(dir, 'a'), '1');
    const h = fingerprintCacheDir(dir);
    fs.rmSync(path.join(dir, 'a'));
    fs.rmSync(path.join(dir, 'b'));
    fs.writeFileSync(path.join(dir, 'a'), '1');
    fs.writeFileSync(path.join(dir, 'b'), '2');
    expect(fingerprintCacheDir(dir)).toBe(h);
  });
});

describe('collectRegularFiles', () => {
  it('does not follow symlinks as files in the list', () => {
    const dir = mkTmp();
    const target = path.join(dir, 'real');
    fs.writeFileSync(target, 'data');
    fs.symlinkSync(target, path.join(dir, 'link'));
    const files = collectRegularFiles(dir);
    expect(files).toContain(target);
    expect(files.some((f) => f.endsWith('link'))).toBe(false);
  });
});
