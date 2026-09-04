import {
  ChangedFile, deletesCodeowners, getApprovers, teamKey, TeamExpander,
} from './github';

jest.mock('@actions/core');

const PATH = '.github/CODEOWNERS';

function file(filename: string, status: string, previousFilename?: string): ChangedFile {
  return { filename, status, previousFilename };
}

describe('deletesCodeowners', () => {
  it('is true when CODEOWNERS is removed', () => {
    expect(deletesCodeowners([file(PATH, 'removed')], PATH)).toBe(true);
  });

  it('is true when CODEOWNERS is renamed away', () => {
    expect(deletesCodeowners([file('docs/OWNERS', 'renamed', PATH)], PATH)).toBe(true);
  });

  it('is false when CODEOWNERS is merely modified', () => {
    expect(deletesCodeowners([file(PATH, 'modified')], PATH)).toBe(false);
  });

  it('is false when a different file is removed', () => {
    expect(deletesCodeowners([file('src/app.ts', 'removed')], PATH)).toBe(false);
  });

  it('is false for an empty changeset', () => {
    expect(deletesCodeowners([], PATH)).toBe(false);
  });
});

describe('teamKey', () => {
  it('converts underscores to hyphens (CODEOWNERS ref -> GitHub slug)', () => {
    expect(teamKey('github_owners')).toBe('github-owners');
  });

  it('lowercases, collapses non-alphanumerics, and trims hyphens', () => {
    expect(teamKey('  Foo _Bar! ')).toBe('foo-bar');
  });

  it('is idempotent on an already-valid slug', () => {
    expect(teamKey('already-good')).toBe('already-good');
  });
});

type Review = { user: { login: string } | null; state: string; commit_id: string };

function octokitWithReviews(reviews: Review[]) {
  return {
    paginate: jest.fn().mockResolvedValue(reviews),
    rest: { pulls: { listReviews: {} } },
  } as never;
}

const review = (login: string | null, state: string, commitId = 'HEAD'): Review => ({
  user: login === null ? null : { login },
  state,
  commit_id: commitId,
});

describe('getApprovers', () => {
  const opts = { dismissStale: false, headSha: 'HEAD' };

  it('returns lowercased logins whose latest review is APPROVED', async () => {
    const octokit = octokitWithReviews([review('Bob', 'APPROVED')]);
    expect(await getApprovers(octokit, 'o', 'r', 1, opts)).toEqual(['bob']);
  });

  it('lets a later CHANGES_REQUESTED supersede an earlier APPROVED', async () => {
    const octokit = octokitWithReviews([
      review('bob', 'APPROVED', 'c1'),
      review('bob', 'CHANGES_REQUESTED', 'c2'),
    ]);
    expect(await getApprovers(octokit, 'o', 'r', 1, opts)).toEqual([]);
  });

  it('ignores COMMENTED reviews when determining the latest stance', async () => {
    const octokit = octokitWithReviews([
      review('bob', 'APPROVED', 'c1'),
      review('bob', 'COMMENTED', 'c2'),
    ]);
    expect(await getApprovers(octokit, 'o', 'r', 1, opts)).toEqual(['bob']);
  });

  it('does not count a DISMISSED review', async () => {
    const octokit = octokitWithReviews([review('bob', 'DISMISSED')]);
    expect(await getApprovers(octokit, 'o', 'r', 1, opts)).toEqual([]);
  });

  it('skips reviews with no user', async () => {
    const octokit = octokitWithReviews([review(null, 'APPROVED')]);
    expect(await getApprovers(octokit, 'o', 'r', 1, opts)).toEqual([]);
  });

  it('with dismissStale, ignores an approval that is not on the head SHA', async () => {
    const octokit = octokitWithReviews([review('bob', 'APPROVED', 'old')]);
    expect(await getApprovers(octokit, 'o', 'r', 1, { dismissStale: true, headSha: 'HEAD' })).toEqual([]);
  });

  it('with dismissStale, counts an approval on the head SHA', async () => {
    const octokit = octokitWithReviews([review('bob', 'APPROVED', 'HEAD')]);
    expect(await getApprovers(octokit, 'o', 'r', 1, { dismissStale: true, headSha: 'HEAD' })).toEqual(['bob']);
  });
});

function octokitWithTeams(members: Record<string, string[]>) {
  const paginate = jest.fn(async (_method: unknown, params: { team_slug: string }) => {
    const found = members[params.team_slug];
    if (found) return found.map((login) => ({ login }));
    const error = new Error('Not Found') as Error & { status: number };
    error.status = 404;
    throw error;
  });
  return { octokit: { paginate, rest: { teams: { listMembersInOrg: {} } } } as never, paginate };
}

describe('TeamExpander', () => {
  it('expands @user to itself and @org/team to members (underscore slug falls back to hyphen)', async () => {
    const { octokit } = octokitWithTeams({ 'github-owners': ['Alice', 'bob'] });
    const expander = new TeamExpander(octokit);

    const logins = await expander.expandOwners(['@alice', '@myorg/github_owners'], 'myorg');

    expect(logins.sort()).toEqual(['alice', 'bob']);
    expect(expander.expansions.get('@myorg/github_owners')).toEqual(['alice', 'bob']);
  });

  it('ignores non-@handle (email) owners', async () => {
    const { octokit, paginate } = octokitWithTeams({});
    const expander = new TeamExpander(octokit);

    const logins = await expander.expandOwners(['dev@example.com'], 'myorg');

    expect(logins).toEqual([]);
    expect(paginate).not.toHaveBeenCalled();
  });

  it('caches team membership so a repeated team is fetched once', async () => {
    const { octokit, paginate } = octokitWithTeams({ 'github-owners': ['alice'] });
    const expander = new TeamExpander(octokit);

    await expander.expandOwners(['@myorg/github-owners'], 'myorg');
    await expander.expandOwners(['@myorg/github-owners'], 'myorg');

    // One fetch total (the hyphen slug resolves on the first try, then cached).
    expect(paginate).toHaveBeenCalledTimes(1);
  });
});
