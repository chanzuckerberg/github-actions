import {
  Decision, DecisionInput, FileOwnership, UncoveredFile,
} from './types';

/** GitHub logins are case-insensitive; compare everything lowercased. */
export function lower(s: string): string {
  return s.toLowerCase();
}

/** Whether `login` is one of the owners of `file`. */
export function isOwner(file: FileOwnership, login: string): boolean {
  const target = lower(login);
  return file.ownerLogins.some((owner) => lower(owner) === target);
}

/**
 * Whether `author` owns every owned file. This is the "author is a code owner"
 * fast path -- when true, the check passes without fetching any reviews. Shared
 * so `main` can decide whether to fetch reviews and `decide` can report it,
 * using one definition of ownership.
 */
export function authorOwnsAll(files: FileOwnership[], author: string): boolean {
  return files.length > 0 && files.every((file) => isOwner(file, author));
}

/** Whether any approver is an owner of `file`. */
function hasApprovingOwner(file: FileOwnership, approvers: Set<string>): boolean {
  return file.ownerLogins.some((owner) => approvers.has(lower(owner)));
}

/**
 * Strict, GitHub-branch-protection-style coverage decision.
 *
 * Every owned file must be covered, where a file is covered if the PR author is
 * one of its owners OR at least one owner of that file has an APPROVED review.
 * The author being an owner of every owned file is the "author is a code owner"
 * fast path; callers may use `authorOwnsEverything` to skip fetching reviews.
 */
export function decide(input: DecisionInput): Decision {
  const author = lower(input.author);
  const approvers = new Set(input.approvers.map(lower));

  const authorOwnsEverything = authorOwnsAll(input.files, author);

  const uncovered: UncoveredFile[] = input.files
    .filter((file) => !isOwner(file, author) && !hasApprovingOwner(file, approvers))
    .map((file) => ({
      path: file.path,
      pattern: file.pattern,
      ownerTokens: file.ownerTokens,
      ownerLogins: file.ownerLogins,
    }));

  return {
    passed: uncovered.length === 0,
    authorOwnsEverything,
    uncovered,
    totalOwnedFiles: input.files.length,
  };
}
