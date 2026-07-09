import * as fs from 'fs';
import * as path from 'path';

export interface BackendS3 {
  bucket: string;
  dynamodbTable: string;
  key: string;
  region: string;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract the first terraform backend "s3" block from HCL text.
 */
export function parseBackendS3FromText(text: string): BackendS3 | null {
  const m = text.match(/backend\s+"s3"\s*\{([\s\S]*?)\n\s*\}/);
  if (!m?.[1]) {
    return null;
  }
  const block = m[1];

  const grab = (name: string): string | undefined => {
    const r = new RegExp(
      `^\\s*${escapeRegex(name)}\\s*=\\s*"([^"]*)"`,
      'gm',
    );
    const mm = r.exec(block);
    return mm?.[1];
  };

  const bucket = grab('bucket');
  const dynamodbTable = grab('dynamodb_table');
  const key = grab('key');
  const region = grab('region');
  if (!bucket || !dynamodbTable || !key || !region) {
    return null;
  }
  return {
    bucket, dynamodbTable, key, region,
  };
}

export function parseBackendS3Block(filePath: string): BackendS3 | null {
  const text = fs.readFileSync(filePath, 'utf-8');
  return parseBackendS3FromText(text);
}

/**
 * Find files containing a backend "s3" block under a directory. Checks:
 *   1. fogg.tf (fogg-managed repos)
 *   2. backend.tf (common Terragrunt-generated or hand-authored)
 *   3. Any *.tf file with a backend "s3" block (fallback)
 *
 * Skips .terragrunt-cache and .terraform directories.
 */
export function* findBackendFiles(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Prefer known filenames first, fall back to scanning all .tf files
  const tfFiles: string[] = [];
  const subdirs: fs.Dirent[] = [];

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '.terragrunt-cache' || ent.name === '.terraform') {
        continue;
      }
      subdirs.push(ent);
    } else if (ent.name === 'fogg.tf' || ent.name === 'backend.tf') {
      // Preferred files — yield immediately if they contain a backend block
      const text = fs.readFileSync(full, 'utf-8');
      if (/backend\s+"s3"\s*\{/.test(text)) {
        yield full;
        return; // One backend per component; don't recurse further in this dir
      }
    } else if (ent.name.endsWith('.tf')) {
      tfFiles.push(full);
    }
  }

  // Fallback: check other .tf files in this directory
  for (const tf of tfFiles) {
    const text = fs.readFileSync(tf, 'utf-8');
    if (/backend\s+"s3"\s*\{/.test(text)) {
      yield tf;
      return;
    }
  }

  // Recurse into subdirectories
  for (const sub of subdirs) {
    yield* findBackendFiles(path.join(dir, sub.name));
  }
}

/**
 * @deprecated Use findBackendFiles instead. Kept for backwards compatibility.
 */
export function* findFoggTfFiles(dir: string): Generator<string> {
  yield* findBackendFiles(dir);
}
