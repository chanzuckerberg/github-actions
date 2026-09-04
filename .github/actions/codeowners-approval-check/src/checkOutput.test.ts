import { buildAnnotations, renderCheckOutput } from './checkOutput';
import { FileVerdict } from './types';

function verdict(
  path: string,
  state: FileVerdict['state'],
  ownerTokens: string[],
  approvedByOwners: string[] = [],
): FileVerdict {
  return {
    path, pattern: path, ownerTokens, ownerLogins: [], state, approvedByOwners,
  };
}

describe('renderCheckOutput', () => {
  const expansions = new Map<string, string[]>([['@org/team', ['a', 'b']]]);

  it('summarizes "waiting on" grouped by owner and lists per-file states', () => {
    const out = renderCheckOutput([
      verdict('a.ts', 'author-owned', ['@alice']),
      verdict('b.ts', 'approved', ['@carol'], ['carol']),
      verdict('c.ts', 'needs-approval', ['@bob', '@org/team']),
      verdict('d.ts', 'needs-approval', ['@bob']),
    ], expansions);

    expect(out.title).toBe('2 of 4 owned file(s) need a code-owner approval');
    // @bob owns 2 needing files, so it sorts first in "waiting on".
    expect(out.summary).toContain('- @bob — 2 files');
    expect(out.summary).toContain('- @org/team (@a, @b) — 1 file');
    // Per-file table renders each state.
    expect(out.text).toContain('Author is an owner');
    expect(out.text).toContain('Approved by @carol');
    expect(out.text).toContain('Needs approval');
    expect(out.text).toContain('@org/team (@a, @b)');
  });

  it('reports full coverage when nothing needs approval', () => {
    const out = renderCheckOutput([verdict('a.ts', 'author-owned', ['@alice'])], new Map());
    expect(out.title).toBe('All 1 owned file(s) covered by a code owner');
    expect(out.summary).toContain('covered by a code owner');
  });
});

describe('buildAnnotations', () => {
  it('emits one failure annotation per needs-approval file only', () => {
    const annotations = buildAnnotations([
      verdict('a.ts', 'author-owned', ['@alice']),
      verdict('c.ts', 'needs-approval', ['@bob']),
    ]);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatchObject({
      path: 'c.ts', start_line: 1, end_line: 1, annotation_level: 'failure',
    });
    expect(annotations[0].message).toContain('@bob');
  });

  it('caps annotations at 50', () => {
    const many = Array.from({ length: 60 }, (_, i) => verdict(`f${i}.ts`, 'needs-approval', ['@bob']));
    expect(buildAnnotations(many)).toHaveLength(50);
  });
});
