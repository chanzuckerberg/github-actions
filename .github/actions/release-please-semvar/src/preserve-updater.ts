import { Updater } from 'release-please/build/src/update';
import { Logger } from 'release-please/build/src/util/logger';

interface Hunk {
  rem: string[];
  add: string[];
}

/**
 * Parses a -U0 unified diff into hunks of removed/added line arrays.
 */
export function parseDiffHunks(diffText: string): Hunk[] {
  const hunks: Hunk[] = [];
  let rem: string[] = [];
  let add: string[] = [];

  for (const line of diffText.split('\n')) {
    if (line.startsWith('@@ ')) {
      if (rem.length || add.length) hunks.push({ rem: [...rem], add: [...add] });
      rem = [];
      add = [];
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      rem.push(line.slice(1));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      add.push(line.slice(1));
    }
  }
  if (rem.length || add.length) hunks.push({ rem, add });
  return hunks;
}

/**
 * Applies the carry-forward hunks onto base content (from the target branch).
 *
 * This is a direct port of the proven 3-way merge logic from the old composite
 * action. For each single-line scalar replacement hunk it:
 *   1. Skips if the target content already contains the new value.
 *   2. Replaces directly if the old value is still present (common case).
 *   3. Falls back to YAML key-prefix matching when the target branch also
 *      changed the line — the carried-forward value wins for that key.
 *   4. Skips non-scalar hunks (insertions, deletions, multi-line rewrites).
 */
export function applyPreserveHunks(
  content: string,
  hunks: Hunk[],
  filePath: string,
  logger?: Logger,
): { content: string; changed: boolean } {
  let result = content;
  let changed = false;

  for (const hunk of hunks) {
    if (hunk.rem.length !== 1 || hunk.add.length !== 1) {
      const desc = `${hunk.rem.length} removed / ${hunk.add.length} added`;
      logger?.warn(`${filePath}: skipping non-scalar hunk (${desc})`);
      continue;
    }

    const oldLine = hunk.rem[0];
    const newLine = hunk.add[0];

    if (result.includes(newLine)) {
      logger?.info(`${filePath}: already contains "${newLine.trim()}", skipping`);
    } else if (result.includes(oldLine)) {
      result = result.split(oldLine).join(newLine);
      logger?.info(`${filePath}: "${oldLine.trim()}" → "${newLine.trim()}"`);
      changed = true;
    } else {
      const colonIdx = oldLine.indexOf(': ');
      if (colonIdx !== -1) {
        const prefix = oldLine.slice(0, colonIdx + 2);
        const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`^${esc}.+$`, 'm');
        if (re.test(result)) {
          result = result.replace(re, newLine);
          logger?.info(`${filePath}: key-prefix match "${prefix.trim()}" → "${newLine.trim()}"`);
          changed = true;
        } else {
          logger?.warn(`${filePath}: could not locate line for "${oldLine.trim()}" — skipping`);
        }
      } else {
        logger?.warn(`${filePath}: no YAML key separator in "${oldLine.trim()}" — skipping`);
      }
    }
  }

  return { content: result, changed };
}

/**
 * An Updater that applies carried-forward diff hunks (from the old release
 * branch) onto the content from the target branch (main). Used by the
 * PreserveValuesPlugin to fold preserved file changes into release-please's
 * single commit.
 */
export class PreserveUpdater implements Updater {
  private hunks: Hunk[];

  private filePath: string;

  constructor(hunks: Hunk[], filePath: string) {
    this.hunks = hunks;
    this.filePath = filePath;
  }

  updateContent(content: string | undefined, logger?: Logger): string {
    if (content === undefined) return '';
    const { content: updated } = applyPreserveHunks(content, this.hunks, this.filePath, logger);
    return updated;
  }
}
