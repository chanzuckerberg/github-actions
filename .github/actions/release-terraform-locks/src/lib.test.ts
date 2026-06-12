import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  escapeRegex,
  findFoggTfFiles,
  parseBackendS3Block,
  parseBackendS3FromText,
} from './lib';

describe('escapeRegex', () => {
  it('escapes metacharacters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('foo[bar]')).toBe('foo\\[bar\\]');
  });
});

describe('parseBackendS3FromText', () => {
  const valid = `
terraform {
  backend "s3" {
    bucket         = "my-bucket"
    dynamodb_table = "locks"
    key            = "path/to/state"
    region         = "us-west-2"
  }
}
`;

  it('parses first s3 backend block', () => {
    expect(parseBackendS3FromText(valid)).toEqual({
      bucket: 'my-bucket',
      dynamodbTable: 'locks',
      key: 'path/to/state',
      region: 'us-west-2',
    });
  });

  it('returns null when block is missing fields', () => {
    const incomplete = `
terraform {
  backend "s3" {
    bucket = "b"
  }
}
`;
    expect(parseBackendS3FromText(incomplete)).toBeNull();
  });

  it('returns null when no backend s3 block', () => {
    expect(parseBackendS3FromText('resource "null" "x" {}')).toBeNull();
  });
});

describe('parseBackendS3Block', () => {
  it('reads fogg.tf from disk', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fogg-parse-'));
    try {
      const f = path.join(root, 'fogg.tf');
      fs.writeFileSync(
        f,
        `
terraform {
  backend "s3" {
    bucket         = "disk-bucket"
    dynamodb_table = "d"
    key            = "k"
    region         = "us-east-1"
  }
}
`,
      );
      expect(parseBackendS3Block(f)).toEqual({
        bucket: 'disk-bucket',
        dynamodbTable: 'd',
        key: 'k',
        region: 'us-east-1',
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('findFoggTfFiles', () => {
  it('finds fogg.tf recursively and skips cache dirs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fogg-find-'));
    try {
      fs.mkdirSync(path.join(root, 'a', '.terragrunt-cache'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(root, 'a', '.terragrunt-cache', 'fogg.tf'),
        '',
      );
      fs.mkdirSync(path.join(root, 'b'), { recursive: true });
      const want = path.join(root, 'b', 'fogg.tf');
      fs.writeFileSync(want, '');

      const found = [...findFoggTfFiles(root)];
      expect(found).toEqual([want]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
