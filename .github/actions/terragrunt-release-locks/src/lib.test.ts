import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  escapeRegex,
  findBackendFiles,
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
  it('reads backend from disk', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-parse-'));
    try {
      const f = path.join(root, 'backend.tf');
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

describe('findBackendFiles', () => {
  it('finds fogg.tf files (backwards compatible)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-find-'));
    try {
      fs.mkdirSync(path.join(root, 'a'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'a', 'fogg.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );

      const found = [...findBackendFiles(root)];
      expect(found).toEqual([path.join(root, 'a', 'fogg.tf')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('finds backend.tf files (non-fogg repos)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-find-'));
    try {
      fs.mkdirSync(path.join(root, 'comp'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'comp', 'backend.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );

      const found = [...findBackendFiles(root)];
      expect(found).toEqual([path.join(root, 'comp', 'backend.tf')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('falls back to other .tf files when no fogg.tf or backend.tf', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-find-'));
    try {
      fs.mkdirSync(path.join(root, 'comp'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'comp', 'main.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );

      const found = [...findBackendFiles(root)];
      expect(found).toEqual([path.join(root, 'comp', 'main.tf')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips .terragrunt-cache and .terraform dirs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-find-'));
    try {
      fs.mkdirSync(path.join(root, '.terragrunt-cache'), { recursive: true });
      fs.writeFileSync(
        path.join(root, '.terragrunt-cache', 'fogg.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );
      fs.mkdirSync(path.join(root, '.terraform'), { recursive: true });
      fs.writeFileSync(
        path.join(root, '.terraform', 'backend.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );

      const found = [...findBackendFiles(root)];
      expect(found).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prefers fogg.tf over other .tf files in same dir', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-find-'));
    try {
      const backendBlock = 'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }';
      fs.writeFileSync(path.join(root, 'fogg.tf'), backendBlock);
      fs.writeFileSync(path.join(root, 'main.tf'), backendBlock);

      const found = [...findBackendFiles(root)];
      expect(found).toEqual([path.join(root, 'fogg.tf')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('findFoggTfFiles (deprecated alias)', () => {
  it('delegates to findBackendFiles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fogg-alias-'));
    try {
      fs.mkdirSync(path.join(root, 'a'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'a', 'fogg.tf'),
        'terraform { backend "s3" { bucket = "b" dynamodb_table = "t" key = "k" region = "r" } }',
      );

      const found = [...findFoggTfFiles(root)];
      expect(found).toEqual([path.join(root, 'a', 'fogg.tf')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
