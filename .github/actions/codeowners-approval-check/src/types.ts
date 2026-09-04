/**
 * A changed file that matched a CODEOWNERS rule, with its owners expanded from
 * raw CODEOWNERS tokens (@user / @org/team) into concrete member logins.
 */
export interface FileOwnership {
  /** Repo-root-relative path of the changed file. */
  path: string;
  /** The CODEOWNERS pattern that matched this file (last-match-wins). */
  pattern: string;
  /** Raw owner tokens as written in CODEOWNERS, e.g. `@user`, `@org/team`. */
  ownerTokens: string[];
  /** Lowercased member logins that own this file (teams already expanded). */
  ownerLogins: string[];
}

/** A file whose owners neither authored nor approved the PR. */
export interface UncoveredFile {
  path: string;
  pattern: string;
  ownerTokens: string[];
  ownerLogins: string[];
}

export interface DecisionInput {
  /** PR author login (any case). */
  author: string;
  /** Logins whose latest review is APPROVED (any case). */
  approvers: string[];
  /** Changed files that matched a CODEOWNERS rule. */
  files: FileOwnership[];
}

export interface Decision {
  passed: boolean;
  /** True when the author is an owner of every owned file (the fast path). */
  authorOwnsEverything: boolean;
  uncovered: UncoveredFile[];
  totalOwnedFiles: number;
}

/** Per-file status used to render the human-facing Check Run breakdown. */
export type FileState = 'author-owned' | 'approved' | 'needs-approval';

export interface FileVerdict {
  path: string;
  pattern: string;
  ownerTokens: string[];
  ownerLogins: string[];
  state: FileState;
  /** For `approved`: the approver logins that own this file. */
  approvedByOwners: string[];
}

/** A Checks API annotation (rendered inline on the file in the diff). */
export interface CheckAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'failure' | 'warning' | 'notice';
  message: string;
}

/** The `output` block of a Check Run. */
export interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
  annotations?: CheckAnnotation[];
}
