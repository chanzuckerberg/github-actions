import * as core from '@actions/core';
import { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Normalize a team name/slug the same way `scripts/sync_teams.py` `_team_key`
 * does in the evolutionaryscale repo: lowercase, collapse every run of
 * non-alphanumeric characters to a single hyphen, and trim leading/trailing
 * hyphens. This reconciles a CODEOWNERS reference like `github_owners` with the
 * GitHub-derived slug `github-owners` without an extra API round-trip.
 */
export function teamKey(nameOrSlug: string): string {
  return nameOrSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Read CODEOWNERS from the PR's BASE ref, never the PR head.
 *
 * This is a security requirement, not a convenience: if we read the head ref, a
 * PR author could edit CODEOWNERS in their own branch to list themselves as an
 * owner and self-approve, bypassing the check entirely. GitHub itself evaluates
 * CODEOWNERS from the base branch for the same reason.
 */
export async function readCodeownersAtBase(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  baseSha: string,
): Promise<string> {
  const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path,
    ref: baseSha,
    mediaType: { format: 'raw' },
  });
  // With `mediaType.format = 'raw'` the API returns the file body as a string.
  return response.data as unknown as string;
}

/** Repo-root-relative paths of every file changed by the PR. */
export async function listChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return files.map((file) => file.filename);
}

export interface ApproverOptions {
  /** When true, only approvals submitted on `headSha` count. */
  dismissStale: boolean;
  headSha: string;
}

/**
 * Return the lowercased logins whose current review stance is APPROVED.
 *
 * Reviews are processed chronologically (the API returns them in submission
 * order), keeping the latest non-COMMENTED/non-PENDING review per user, so a
 * later CHANGES_REQUESTED or DISMISSED supersedes an earlier approval. When
 * `dismissStale` is set, an approval only counts if it was submitted on the
 * current head SHA.
 */
export async function getApprovers(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  options: ApproverOptions,
): Promise<string[]> {
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const latest = new Map<string, { state: string; commitId: string }>();
  reviews.forEach((review) => {
    const login = review.user?.login;
    if (!login) return;
    const state = review.state ?? '';
    // COMMENTED and PENDING reviews never change a reviewer's approval stance.
    if (state === 'COMMENTED' || state === 'PENDING') return;
    latest.set(login.toLowerCase(), { state, commitId: review.commit_id ?? '' });
  });

  const approvers: string[] = [];
  latest.forEach((review, login) => {
    if (review.state !== 'APPROVED') return;
    if (options.dismissStale && review.commitId !== options.headSha) return;
    approvers.push(login);
  });
  return approvers;
}

/**
 * Expands CODEOWNERS owner tokens (@user, @org/team) into concrete member
 * logins using an org-scoped token. Team memberships are fetched once per slug
 * and cached. The per-token expansions are also recorded for debug logging.
 */
export class TeamExpander {
  // Cache in-flight promises (not just results) so concurrent files that share
  // a team trigger only one API fetch.
  private teamCache = new Map<string, Promise<string[]>>();

  /** token-as-written -> expanded lowercased logins (for informative logs). */
  readonly expansions = new Map<string, string[]>();

  constructor(private readonly octokit: Octokit) {}

  /** Expand a set of owner tokens into a de-duplicated list of member logins. */
  async expandOwners(tokens: string[], defaultOrg: string): Promise<string[]> {
    const expandedPerToken = await Promise.all(
      tokens.map(async (token) => {
        const expanded = await this.expandOne(token, defaultOrg);
        this.expansions.set(token, expanded);
        return expanded;
      }),
    );
    const logins = new Set<string>();
    expandedPerToken.forEach((expanded) => expanded.forEach((login) => logins.add(login)));
    return [...logins];
  }

  private async expandOne(token: string, defaultOrg: string): Promise<string[]> {
    // CODEOWNERS also permits bare email owners; those cannot be mapped to a
    // login, so they are skipped (a file owned solely by an email can never be
    // satisfied by this check -- surfaced as a warning).
    if (!token.startsWith('@')) {
      core.warning(`Owner "${token}" is not a @handle; cannot resolve to a GitHub login, ignoring.`);
      return [];
    }
    const handle = token.slice(1);
    if (handle.includes('/')) {
      const slashIndex = handle.indexOf('/');
      const org = handle.slice(0, slashIndex);
      const slug = handle.slice(slashIndex + 1);
      return this.expandTeam(org || defaultOrg, slug);
    }
    return [handle.toLowerCase()];
  }

  private expandTeam(org: string, slug: string): Promise<string[]> {
    const cacheKey = `${org}/${slug}`.toLowerCase();
    const cached = this.teamCache.get(cacheKey);
    if (cached) return cached;
    const pending = this.fetchTeamMembers(org, slug);
    this.teamCache.set(cacheKey, pending);
    return pending;
  }

  private async fetchTeamMembers(org: string, slug: string): Promise<string[]> {
    // Try the slug exactly as written first, then the normalized form, so a
    // CODEOWNERS entry that uses underscores (github_owners) still resolves to
    // the real hyphenated slug (github-owners).
    const candidates = [...new Set([slug.toLowerCase(), teamKey(slug)])];
    for (let i = 0; i < candidates.length; i += 1) {
      try {
        const members = await this.octokit.paginate(this.octokit.rest.teams.listMembersInOrg, {
          org,
          team_slug: candidates[i],
          per_page: 100,
        });
        return members
          .map((member) => member.login?.toLowerCase())
          .filter((login): login is string => Boolean(login));
      } catch (error) {
        const { status } = error as { status?: number };
        if (status === 404) continue;
        throw error;
      }
    }
    core.warning(
      `Could not resolve team @${org}/${slug} (not found or token lacks access); treating it as having no members.`,
    );
    return [];
  }
}
