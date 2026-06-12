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
 * Extract the first terraform backend "s3" block from fogg.tf text (remote_state uses data sources).
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

export function* findFoggTfFiles(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '.terragrunt-cache' || ent.name === '.terraform') {
        continue;
      }
      yield* findFoggTfFiles(full);
    } else if (ent.name === 'fogg.tf') {
      yield full;
    }
  }
}
