import { authorOwnsAll, classifyFiles, decide } from './decide';
import { FileOwnership } from './types';

function file(path: string, ownerLogins: string[], pattern = path): FileOwnership {
  return {
    path,
    pattern,
    ownerTokens: ownerLogins.map((l) => `@${l}`),
    ownerLogins,
  };
}

describe('decide', () => {
  it('passes and sets authorOwnsEverything when the author owns every file', () => {
    const result = decide({
      author: 'alice',
      approvers: [],
      files: [file('a.py', ['alice']), file('b.py', ['alice', 'bob'])],
    });
    expect(result.passed).toBe(true);
    expect(result.authorOwnsEverything).toBe(true);
    expect(result.uncovered).toHaveLength(0);
  });

  it('passes when an approving owner covers a file the author does not own', () => {
    const result = decide({
      author: 'alice',
      approvers: ['bob'],
      files: [file('b.py', ['bob', 'carol'])],
    });
    expect(result.passed).toBe(true);
    expect(result.authorOwnsEverything).toBe(false);
  });

  it('fails and reports the uncovered files when no owner approved', () => {
    const result = decide({
      author: 'alice',
      approvers: ['dave'],
      files: [file('a.py', ['alice']), file('b.py', ['bob', 'carol'])],
    });
    expect(result.passed).toBe(false);
    expect(result.uncovered.map((f) => f.path)).toEqual(['b.py']);
    expect(result.totalOwnedFiles).toBe(2);
  });

  it('is case-insensitive for author and approver logins', () => {
    const result = decide({
      author: 'Alice',
      approvers: ['BOB'],
      files: [file('a.py', ['ALICE']), file('b.py', ['bob'])],
    });
    expect(result.passed).toBe(true);
  });

  it('treats a file the author co-owns as covered without an approval', () => {
    const result = decide({
      author: 'alice',
      approvers: [],
      files: [file('a.py', ['alice', 'bob'])],
    });
    expect(result.passed).toBe(true);
  });

  it('reports authorOwnsEverything false but still passes via approvals across files', () => {
    const result = decide({
      author: 'alice',
      approvers: ['carol'],
      files: [file('a.py', ['alice']), file('b.py', ['carol'])],
    });
    expect(result.passed).toBe(true);
    expect(result.authorOwnsEverything).toBe(false);
    expect(result.uncovered).toHaveLength(0);
  });

  it('returns authorOwnsEverything false for an empty file set', () => {
    const result = decide({ author: 'alice', approvers: [], files: [] });
    expect(result.passed).toBe(true);
    expect(result.authorOwnsEverything).toBe(false);
  });

  it('fails listing only the uncovered file when coverage is mixed', () => {
    const result = decide({
      author: 'zoe',
      approvers: ['bob'], // owns a.ts but not b.ts
      files: [file('a.ts', ['bob']), file('b.ts', ['carol'])],
    });
    expect(result.passed).toBe(false);
    expect(result.uncovered.map((f) => f.path)).toEqual(['b.ts']);
  });

  it('treats a file whose owners resolve to no logins (e.g. an email owner) as uncovered', () => {
    const result = decide({
      author: 'alice',
      approvers: ['alice', 'bob'],
      files: [{
        path: 'x.ts', pattern: 'x.ts', ownerTokens: ['dev@example.com'], ownerLogins: [],
      }],
    });
    expect(result.passed).toBe(false);
    expect(result.uncovered.map((f) => f.path)).toEqual(['x.ts']);
  });
});

describe('authorOwnsAll', () => {
  it('is true when the author owns every file (case-insensitive)', () => {
    expect(authorOwnsAll([file('a.py', ['ALICE']), file('b.py', ['alice', 'bob'])], 'alice')).toBe(true);
  });

  it('is false when the author is missing from any file', () => {
    expect(authorOwnsAll([file('a.py', ['alice']), file('b.py', ['bob'])], 'alice')).toBe(false);
  });

  it('is false for an empty file set (nothing to short-circuit)', () => {
    expect(authorOwnsAll([], 'alice')).toBe(false);
  });
});

describe('classifyFiles', () => {
  it('labels each file author-owned / approved / needs-approval', () => {
    const verdicts = classifyFiles({
      author: 'alice',
      approvers: ['carol'],
      files: [
        file('a.ts', ['alice', 'dave']), // author owns
        file('b.ts', ['carol']), // approved by owner carol
        file('c.ts', ['bob']), // needs approval
      ],
    });
    expect(verdicts.map((v) => v.state)).toEqual(['author-owned', 'approved', 'needs-approval']);
    expect(verdicts[1].approvedByOwners).toEqual(['carol']);
    expect(verdicts[0].approvedByOwners).toEqual([]);
    expect(verdicts[2].approvedByOwners).toEqual([]);
  });

  it('is case-insensitive for author and approver matching', () => {
    const verdicts = classifyFiles({
      author: 'Alice',
      approvers: ['BOB'],
      files: [file('a.ts', ['alice']), file('b.ts', ['bob'])],
    });
    expect(verdicts.map((v) => v.state)).toEqual(['author-owned', 'approved']);
  });
});
