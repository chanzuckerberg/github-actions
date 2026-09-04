import { renderSummaryMarkdown, shortDescription } from './summary';
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

const expansions = new Map<string, string[]>([['@org/team', ['a', 'b']]]);

describe('shortDescription', () => {
  it('lists who is waiting, ordered by files covered', () => {
    const desc = shortDescription([
      verdict('a.ts', 'author-owned', ['@alice']),
      verdict('c.ts', 'needs-approval', ['@bob', '@org/team']),
      verdict('d.ts', 'needs-approval', ['@bob']),
    ]);
    expect(desc).toBe('2 of 3 owned file(s) need approval — waiting on @bob, @org/team');
  });

  it('reports full coverage when nothing needs approval', () => {
    expect(shortDescription([verdict('a.ts', 'author-owned', ['@alice'])]))
      .toBe('All 1 owned file(s) covered by a code owner');
  });

  it('never exceeds 140 characters', () => {
    const many = Array.from({ length: 40 }, (_, i) => verdict(`f${i}.ts`, 'needs-approval', [`@owner-${i}`]));
    expect(shortDescription(many).length).toBeLessThanOrEqual(140);
  });
});

describe('renderSummaryMarkdown', () => {
  it('groups "waiting on" by owner and lists per-file states', () => {
    const md = renderSummaryMarkdown([
      verdict('a.ts', 'author-owned', ['@alice']),
      verdict('b.ts', 'approved', ['@carol'], ['carol']),
      verdict('c.ts', 'needs-approval', ['@bob', '@org/team']),
      verdict('d.ts', 'needs-approval', ['@bob']),
    ], expansions);

    expect(md).toContain('**2 of 4** owned file(s) still need a code-owner approval.');
    expect(md).toContain('- @bob — 2 files');
    expect(md).toContain('- @org/team (@a, @b) — 1 file');
    expect(md).toContain('Author is an owner');
    expect(md).toContain('Approved by @carol');
    expect(md).toContain('Needs approval');
  });

  it('reports full coverage when nothing needs approval', () => {
    const md = renderSummaryMarkdown([verdict('a.ts', 'author-owned', ['@alice'])], new Map());
    expect(md).toContain('All 1 owned file(s) are covered by a code owner.');
  });
});
