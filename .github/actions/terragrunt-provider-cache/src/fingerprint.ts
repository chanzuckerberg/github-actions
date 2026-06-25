import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Stable fingerprint of all regular files under dir (sorted paths, sha256 per file,
 * then sha256 of the sha256sum-style lines (same algorithm as the former shell helper).
 */
export function fingerprintCacheDir(dir: string): string {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }

  const files = collectRegularFiles(dir);
  if (files.length === 0) {
    return 'EMPTY';
  }

  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const lines: string[] = [];
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const h = crypto.createHash('sha256').update(buf).digest('hex');
    lines.push(`${h}  ${f}`);
  }
  const combined = `${lines.join('\n')}\n`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

export function collectRegularFiles(dir: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectRegularFiles(full));
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}
