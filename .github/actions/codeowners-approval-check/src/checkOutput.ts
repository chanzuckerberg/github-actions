import { CheckAnnotation, FileVerdict } from './types';

// GitHub accepts at most 50 annotations per Checks API request.
const MAX_ANNOTATIONS = 50;

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

export interface RenderedOutput {
  title: string;
  summary: string;
  text: string;
}

/**
 * Build the Check Run `output`: a title, a `summary` with a "Waiting on"
 * breakdown grouped by the owners that can still unblock the PR (any one owner
 * per file suffices), and a `text` table showing each owned file's state.
 */
export function renderCheckOutput(
  verdicts: FileVerdict[],
  expansions: Map<string, string[]>,
): RenderedOutput {
  const total = verdicts.length;
  const needs = verdicts.filter((v) => v.state === 'needs-approval');

  const title = needs.length === 0
    ? `All ${total} owned file(s) covered by a code owner`
    : `${needs.length} of ${total} owned file(s) need a code-owner approval`;

  const summaryLines: string[] = [];
  if (needs.length === 0) {
    summaryLines.push(`All ${total} owned file(s) are covered by a code owner.`);
  } else {
    summaryLines.push(`**${needs.length} of ${total}** owned file(s) still need a code-owner approval.`, '');
    summaryLines.push('**Waiting on** (any one owner per file can approve):');

    // Count files each owner token could still unblock. A file with multiple
    // owners appears under each, since any one of them can approve it.
    const waiting = new Map<string, number>();
    needs.forEach((v) => v.ownerTokens.forEach((token) => {
      waiting.set(token, (waiting.get(token) ?? 0) + 1);
    }));
    [...waiting.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .forEach(([token, count]) => {
        summaryLines.push(`- ${describeOwner(token, expansions)} — ${count} file${count === 1 ? '' : 's'}`);
      });
  }

  const textLines = ['| File | Owning rule | Status | Owners |', '| --- | --- | --- | --- |'];
  verdicts.forEach((v) => {
    const owners = v.ownerTokens.map((t) => describeOwner(t, expansions)).join(', ');
    textLines.push(`| \`${v.path}\` | \`${v.pattern}\` | ${statusText(v)} | ${owners} |`);
  });

  return { title, summary: summaryLines.join('\n'), text: textLines.join('\n') };
}

/**
 * One inline annotation per file still needing approval (capped at GitHub's
 * 50-per-request limit), pointing the reviewer at the exact files.
 */
export function buildAnnotations(verdicts: FileVerdict[]): CheckAnnotation[] {
  return verdicts
    .filter((v) => v.state === 'needs-approval')
    .slice(0, MAX_ANNOTATIONS)
    .map((v) => ({
      path: v.path,
      start_line: 1,
      end_line: 1,
      annotation_level: 'failure' as const,
      message: `Needs approval from a code owner: ${v.ownerTokens.join(', ')}`,
    }));
}
