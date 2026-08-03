import { parse, matchFile, CodeOwnersEntry } from 'codeowners-utils';

/** A changed file mapped to its owning CODEOWNERS rule (raw owner tokens). */
export interface MatchedFile {
  path: string;
  pattern: string;
  owners: string[];
}

/**
 * Parse CODEOWNERS text into entries. `codeowners-utils` returns entries in
 * reverse file order so that `matchFile` yields the last matching rule, which
 * is GitHub's last-match-wins semantics.
 */
export function parseCodeowners(text: string): CodeOwnersEntry[] {
  return parse(text);
}

/**
 * Map each changed file to its owning rule and keep only the files that both
 * match a rule and have at least one owner. Files that match no rule (or a rule
 * with no owners) are unowned and impose no approval requirement.
 */
export function matchOwnedFiles(paths: string[], entries: CodeOwnersEntry[]): MatchedFile[] {
  return paths
    .map((path) => ({ path, entry: matchFile(path, entries) }))
    .filter((match): match is { path: string; entry: CodeOwnersEntry } => (
      match.entry !== null && match.entry.owners.length > 0
    ))
    .map(({ path, entry }) => ({ path, pattern: entry.pattern, owners: entry.owners }));
}
