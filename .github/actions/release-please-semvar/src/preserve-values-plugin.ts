import { ManifestPlugin } from 'release-please/build/src/plugin';
import { CandidateReleasePullRequest, RepositoryConfig } from 'release-please/build/src/manifest';
import { Scm } from 'release-please/build/src/scm';
import { Logger, logger as defaultLogger } from 'release-please/build/src/util/logger';
import { PreserveUpdater, parseDiffHunks } from './preserve-updater';

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '[^/]*').replace(/\?/g, '.')}$`);
}

/**
 * A release-please ManifestPlugin that carries forward file changes from the
 * previous release branch tip into the new release commit.
 *
 * When release-please rebuilds a release branch from the target branch (main),
 * it discards any commits that existed on the old branch — including image-tag
 * updates committed by the CI build. This plugin reads the old branch's
 * values.yaml files, computes the diff vs the branch's base, and injects
 * Updaters into the candidate PR so the carried-forward changes are folded into
 * the single release-please commit.
 */
export class PreserveValuesPlugin extends ManifestPlugin {
  private patterns: string[];

  constructor(
    github: Scm,
    targetBranch: string,
    repositoryConfig: RepositoryConfig,
    patterns: string[],
    log?: Logger,
  ) {
    super(github, targetBranch, repositoryConfig, log ?? defaultLogger);
    this.patterns = patterns;
  }

  async run(
    candidates: CandidateReleasePullRequest[],
  ): Promise<CandidateReleasePullRequest[]> {
    if (this.patterns.length === 0) return candidates;

    for (const candidate of candidates) {
      const branch = candidate.pullRequest.headRefName;
      if (!branch) continue;

      let oldBranchSha: string;
      try {
        oldBranchSha = await this.getBranchSha(branch);
      } catch {
        this.logger.info(`No existing branch ${branch} (first release), skipping preserve`);
        continue;
      }

      this.logger.info(`Preserving files for branch ${branch} (old SHA: ${oldBranchSha})`);

      const files = await this.resolveFiles(oldBranchSha);
      if (files.length === 0) {
        this.logger.info('No files matched preserve patterns');
        continue;
      }

      this.logger.info(`Resolved ${files.length} file(s) to preserve: ${files.join(', ')}`);

      let mergeBase: string;
      try {
        mergeBase = await this.getMergeBase(oldBranchSha, this.targetBranch);
      } catch (err) {
        this.logger.warn(`Could not determine merge-base for ${branch}, skipping preserve: ${err}`);
        continue;
      }

      for (const file of files) {
        const hunks = await this.getFileHunks(mergeBase, oldBranchSha, file);
        if (hunks.length === 0) {
          this.logger.info(`${file}: no changes between base and old branch, nothing to carry forward`);
          continue;
        }

        candidate.pullRequest.updates.push({
          path: file,
          createIfMissing: false,
          updater: new PreserveUpdater(hunks, file),
        });
      }
    }

    return candidates;
  }

  private async getBranchSha(branch: string): Promise<string> {
    const branchRef = await this.github.getFileContentsOnBranch('.', branch);
    // getFileContentsOnBranch won't work for this — use the underlying octokit
    // to get the branch ref SHA. Cast to GitHub to access the API.
    const gh = this.github as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const octokit = gh.gitHubApi?.octokit ?? gh.octokit;
    const { owner, repo } = this.github.repository;
    const { data } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return data.object.sha;
  }

  private async resolveFiles(ref: string): Promise<string[]> {
    const gh = this.github as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const octokit = gh.gitHubApi?.octokit ?? gh.octokit;
    const { owner, repo } = this.github.repository;

    const regexes = this.patterns.map(globToRegex);

    const allFiles: string[] = [];
    const fetchTree = async (treeSha: string, prefix = ''): Promise<void> => {
      const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: 'true',
      });
      for (const item of data.tree) {
        if (item.type === 'blob' && item.path) {
          allFiles.push(prefix ? `${prefix}/${item.path}` : item.path);
        }
      }
    };

    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: ref,
    });
    await fetchTree(commitData.tree.sha);

    const matched = new Set<string>();
    for (const regex of regexes) {
      let found = false;
      for (const file of allFiles) {
        if (regex.test(file)) {
          matched.add(file);
          found = true;
        }
      }
      if (!found) {
        this.logger.info(`Pattern '${regex.source}' matched no files at ${ref.slice(0, 7)}`);
      }
    }

    return [...matched].sort();
  }

  private async getMergeBase(sha: string, branch: string): Promise<string> {
    const gh = this.github as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const octokit = gh.gitHubApi?.octokit ?? gh.octokit;
    const { owner, repo } = this.github.repository;

    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base: sha,
      head: branch,
    });
    return data.merge_base_commit.sha;
  }

  private async getFileHunks(base: string, head: string, file: string): Promise<ReturnType<typeof parseDiffHunks>> {
    const gh = this.github as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const octokit = gh.gitHubApi?.octokit ?? gh.octokit;
    const { owner, repo } = this.github.repository;

    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    const fileEntry = data.files?.find((f: any) => f.filename === file); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!fileEntry || !fileEntry.patch) return [];

    // The compareCommits patch uses a context-sensitive format; rebuild a minimal
    // unified diff for our -U0-style parser by stripping context lines.
    const lines = fileEntry.patch.split('\n');
    const diffLines: string[] = [];
    for (const line of lines) {
      if (
        line.startsWith('@@')
        || (line.startsWith('-') && !line.startsWith('---'))
        || (line.startsWith('+') && !line.startsWith('+++'))
      ) {
        diffLines.push(line);
      }
    }

    return parseDiffHunks(diffLines.join('\n'));
  }
}
