import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  decideRelease,
  escapeRegex,
  findBackendFiles,
  findFoggTfFiles,
  parseBackendS3Block,
  parseBackendS3FromText,
  parseLockInfo,
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

describe('parseLockInfo', () => {
  it('parses the Info json terraform writes', () => {
    const raw = '{"ID":"6151c49a","Operation":"OperationTypeApply","Who":"runner@host-a","Created":"2026-08-13T15:44:59.806500055Z"}';
    expect(parseLockInfo(raw)).toEqual({
      ID: '6151c49a',
      Operation: 'OperationTypeApply',
      Who: 'runner@host-a',
      Created: '2026-08-13T15:44:59.806500055Z',
    });
  });

  it('returns null for empty, malformed, or non-object json', () => {
    expect(parseLockInfo(undefined)).toBeNull();
    expect(parseLockInfo('')).toBeNull();
    expect(parseLockInfo('{"ID":')).toBeNull();
    expect(parseLockInfo('[1,2]')).toBeNull();
  });
});

describe('decideRelease', () => {
  const jobStart = new Date('2026-08-13T15:42:36Z');

  it('keeps a lock held by another runner', () => {
    const decision = decideRelease({
      info: parseLockInfo(
        '{"ID":"6151c49a-de51-49cd-414a-0b5483205011","Operation":"OperationTypeApply",'
        + '"Who":"runner@amd64-hgdcz-runner-7slq8","Created":"2026-08-13T15:44:59.806500055Z"}',
      ),
      self: 'runner@amd64-hgdcz-runner-nj2sx',
      createdAfter: new Date('2026-08-13T15:41:16Z'),
    });
    expect(decision.release).toBe(false);
    expect(decision.reason).toContain('runner@amd64-hgdcz-runner-7slq8');
  });

  it('releases a lock this job created', () => {
    const decision = decideRelease({
      info: parseLockInfo(
        '{"ID":"abc","Operation":"OperationTypeApply","Who":"runner@host-a","Created":"2026-08-13T15:44:59Z"}',
      ),
      self: 'runner@host-a',
      createdAfter: jobStart,
    });
    expect(decision.release).toBe(true);
  });

  it('keeps a same-hostname lock that predates this job', () => {
    const decision = decideRelease({
      info: parseLockInfo(
        '{"ID":"abc","Who":"runner@host-a","Created":"2026-08-13T15:40:00Z"}',
      ),
      self: 'runner@host-a',
      createdAfter: jobStart,
    });
    expect(decision.release).toBe(false);
    expect(decision.reason).toContain('before this job started');
  });

  it('ignores age when no createdAfter is given', () => {
    const decision = decideRelease({
      info: parseLockInfo('{"ID":"abc","Who":"runner@host-a","Created":"2020-01-01T00:00:00Z"}'),
      self: 'runner@host-a',
    });
    expect(decision.release).toBe(true);
  });

  it('keeps a lock whose Who is missing or Created is unparsable', () => {
    expect(
      decideRelease({ info: { ID: 'abc' }, self: 'runner@host-a' }).release,
    ).toBe(false);
    expect(
      decideRelease({
        info: { ID: 'abc', Who: 'runner@host-a', Created: 'not-a-date' },
        self: 'runner@host-a',
        createdAfter: jobStart,
      }).release,
    ).toBe(false);
  });

  it('releases a row terraform itself cannot parse', () => {
    const decision = decideRelease({
      info: parseLockInfo(''),
      self: 'runner@host-a',
      createdAfter: jobStart,
    });
    expect(decision.release).toBe(true);
    expect(decision.reason).toContain('no parsable Info');
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
