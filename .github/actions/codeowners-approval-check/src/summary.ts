import { FileVerdict } from './types';

// Commit status descriptions are truncated by GitHub at 140 characters.
const MAX_DESCRIPTION = 140;

/** Render an owner token, expanding a team inline to its members. */
function describeOwner(token: string, expansions: Map<string, string[]>): string {
  const logins = expansions.get(token);
  if (token.includes('/') && logins) {
    return logins.length ? `${token} (${logins.map((l) => `@${l}`).join(', ')})` : `${token} (no members)`;
  }
  return token;
}

/** Human-readable status cell for a file's verdict. */
function statusText(verdict: FileVerdict): string {
  if (verdict.state === 'author-owned') return 'Author is an owner';
  if (verdict.state === 'approved') {
    return `Approved by ${verdict.approvedByOwners.map((l) => `@${l}`).join(', ')}`;
  }
  return 'Needs approval';
}

/** Owner tokens that can still unblock the PR, ordered by how many files each covers. */
function waitingOn(needs: FileVerdict[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  needs.forEach((v) => v.ownerTokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Compact one-line commit-status description (<=140 chars): who is still
 * blocking, so the "who" is visible on the PR without opening Details.
 */
export function shortDescription(verdicts: FileVerdict[]): string {
  const total = verdicts.length;
  const needs = verdicts.filter((v) => v.state === 'needs-approval');
  if (needs.length === 0) {
    return `All ${total} owned file(s) covered by a code owner`;
  }
  const tokens = waitingOn(needs).map(([token]) => token).join(', ');
  return `${needs.length} of ${total} owned file(s) need approval — waiting on ${tokens}`.slice(0, MAX_DESCRIPTION);
}

/**
 * Full markdown breakdown for the Actions job summary (reachable via the commit
 * status' Details link): a "waiting on" list grouped by the owners that can
 * still unblock the PR, plus a per-file table of each owned file's state.
 */
export function renderSummaryMarkdown(
  verdicts: FileVerdict[],
  expansions: Map<string, string[]>,
): string {
  const total = verdicts.length;
  const needs = verdicts.filter((v) => v.state === 'needs-approval');
  const lines: string[] = ['## CODEOWNERS approval', ''];

  if (needs.length === 0) {
    lines.push(`All ${total} owned file(s) are covered by a code owner.`);
  } else {
    lines.push(`**${needs.length} of ${total}** owned file(s) still need a code-owner approval.`, '');
    lines.push('### Waiting on (any one owner per file can approve)');
    waitingOn(needs).forEach(([token, count]) => {
      lines.push(`- ${describeOwner(token, expansions)} — ${count} file${count === 1 ? '' : 's'}`);
    });
  }

  lines.push(
    '',
    '### Owned files changed (matched a CODEOWNERS rule)',
    '',
    '| File | Owning rule | Status | Owners |',
    '| --- | --- | --- | --- |',
  );
  verdicts.forEach((v) => {
    const owners = v.ownerTokens.map((t) => describeOwner(t, expansions)).join(', ');
    lines.push(`| \`${v.path}\` | \`${v.pattern}\` | ${statusText(v)} | ${owners} |`);
  });

  return lines.join('\n');
}
