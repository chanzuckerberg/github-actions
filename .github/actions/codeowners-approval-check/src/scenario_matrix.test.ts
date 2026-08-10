import { matchOwnedFiles, parseCodeowners } from './codeowners';
import { decide } from './decide';
import { FileOwnership } from './types';

/**
 * End-to-end coverage of the gate over the requested scenario matrix:
 *
 *   ["author is code owner", "author is not code owner"]
 *   x ["changes files they own",
 *      "changes files they don't own (but owned by someone)",
 *      "changes files with no owner"]
 *   x ["codeowner approved", "non-codeowner approved", "no one approved"]
 *
 * This drives the real pipeline (parse CODEOWNERS -> match changed files ->
 * decide), only stubbing team expansion by treating each `@user` token as its
 * own login. That mirrors production minus the network/team lookup, which is
 * exercised separately in github.test.ts.
 *
 * Note: 3 of the 18 cells are logically impossible -- an author who is not a
 * code owner of anything cannot "change files they own" -- so 15 cells remain.
 */

const CODEOWNERS = `
/a/ @alice @dave
/b/ @bob @carol
`;

// alice owns /a/; zoe is listed nowhere (not a code owner). erin is a valid
// reviewer who owns nothing.
const OWNER_AUTHOR = 'alice';
const NON_OWNER_AUTHOR = 'zoe';

type Changed = 'owns' | 'notowns' | 'unowned';
type Approval = 'codeowner' | 'noncodeowner' | 'none';

interface Row {
  authorIsCodeowner: boolean;
  changed: Changed;
  approval: Approval;
  expected: boolean;
}

function evaluate(changedPath: string, author: string, approvers: string[]): boolean {
  const entries = parseCodeowners(CODEOWNERS);
  const files: FileOwnership[] = matchOwnedFiles([changedPath], entries).map((match) => ({
    path: match.path,
    pattern: match.pattern,
    ownerTokens: match.owners,
    // Stub team expansion: an @user token resolves to that lowercased login.
    ownerLogins: match.owners.map((owner) => owner.replace(/^@/, '').toLowerCase()),
  }));
  return decide({ author, approvers, files }).passed;
}

function changedPathFor(changed: Changed): string {
  if (changed === 'owns') return 'a/file.ts'; // owned by @alice, @dave
  if (changed === 'notowns') return 'b/file.ts'; // owned by @bob, @carol
  return 'c/file.ts'; // matches no rule -> unowned
}

function approversFor(row: Row): string[] {
  if (row.approval === 'none') return [];
  if (row.approval === 'noncodeowner') return ['erin']; // owns nothing
  // "codeowner approved": an owner of the changed file (for unowned there is no
  // owner, so any codeowner is a no-op and the outcome is a pass regardless).
  if (row.changed === 'owns') return ['dave'];
  if (row.changed === 'notowns') return ['bob'];
  return ['bob'];
}

// Expected outcomes:
// - unowned changed file -> always pass (nothing to enforce).
// - author owns the changed file -> always pass (fast path; approvals irrelevant).
// - author does not own the changed file -> pass iff an owner of it approved.
const rows: Row[] = [
  // author IS a code owner (alice)
  {
    authorIsCodeowner: true, changed: 'owns', approval: 'codeowner', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'owns', approval: 'noncodeowner', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'owns', approval: 'none', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'notowns', approval: 'codeowner', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'notowns', approval: 'noncodeowner', expected: false,
  },
  {
    authorIsCodeowner: true, changed: 'notowns', approval: 'none', expected: false,
  },
  {
    authorIsCodeowner: true, changed: 'unowned', approval: 'codeowner', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'unowned', approval: 'noncodeowner', expected: true,
  },
  {
    authorIsCodeowner: true, changed: 'unowned', approval: 'none', expected: true,
  },
  // author is NOT a code owner (zoe); the "owns" row is impossible and omitted
  {
    authorIsCodeowner: false, changed: 'notowns', approval: 'codeowner', expected: true,
  },
  {
    authorIsCodeowner: false, changed: 'notowns', approval: 'noncodeowner', expected: false,
  },
  {
    authorIsCodeowner: false, changed: 'notowns', approval: 'none', expected: false,
  },
  {
    authorIsCodeowner: false, changed: 'unowned', approval: 'codeowner', expected: true,
  },
  {
    authorIsCodeowner: false, changed: 'unowned', approval: 'noncodeowner', expected: true,
  },
  {
    authorIsCodeowner: false, changed: 'unowned', approval: 'none', expected: true,
  },
];

describe('scenario matrix', () => {
  rows.forEach((row) => {
    const who = row.authorIsCodeowner ? 'author is a code owner' : 'author is not a code owner';
    const title = `${who} | changes files ${row.changed} | ${row.approval} approved -> ${row.expected ? 'pass' : 'fail'}`;
    it(title, () => {
      const author = row.authorIsCodeowner ? OWNER_AUTHOR : NON_OWNER_AUTHOR;
      const passed = evaluate(changedPathFor(row.changed), author, approversFor(row));
      expect(passed).toBe(row.expected);
    });
  });
});
