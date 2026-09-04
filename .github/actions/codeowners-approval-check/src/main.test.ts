import * as core from '@actions/core';
import * as github from '@actions/github';
import * as gh from './github';
import { run } from './main';

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: { repo: { owner: 'o', repo: 'r' }, payload: {} },
  getOctokit: jest.fn(),
}));
// Manual mock (not auto): TeamExpander needs a real `expansions` map and an
// `expandOwners` that returns logins, which auto-mocking would not provide.
jest.mock('./github', () => ({
  readCodeownersAtBase: jest.fn(),
  listChangedFiles: jest.fn(),
  deletesCodeowners: jest.fn(),
  getApprovers: jest.fn(),
  upsertCheckRun: jest.fn(),
  TeamExpander: jest.fn().mockImplementation(() => ({
    expansions: new Map<string, string[]>(),
    expandOwners: jest.fn(async (tokens: string[]) => tokens.map((t) => t.replace(/^@/, '').toLowerCase())),
  })),
}));

const octokit = {};

interface Pr {
  number: number;
  user: { login: string };
  base: { sha: string };
  head: { sha: string };
}

const DEFAULT_PR: Pr = {
  number: 1,
  user: { login: 'alice' },
  base: { sha: 'BASE' },
  head: { sha: 'HEAD' },
};

function setPayload(pr: Pr | null): void {
  (github.context as unknown as { payload: Record<string, unknown> }).payload = pr
    ? { pull_request: pr }
    : {};
}

const readCodeownersAtBase = gh.readCodeownersAtBase as jest.Mock;
const listChangedFiles = gh.listChangedFiles as jest.Mock;
const deletesCodeowners = gh.deletesCodeowners as jest.Mock;
const getApprovers = gh.getApprovers as jest.Mock;
const upsertCheckRun = gh.upsertCheckRun as jest.Mock;

interface CheckOutput { title: string; annotations?: unknown[] }

/** The (conclusion, output) of the most recent upsertCheckRun call. */
function lastCheck(): { conclusion: string; output: CheckOutput } {
  const { calls } = upsertCheckRun.mock;
  const call = calls[calls.length - 1];
  return { conclusion: call[5] as string, output: call[6] as CheckOutput };
}

const inputs: Record<string, string> = {
  'github-token': 'gh-token',
  'org-token': 'org-token',
  org: 'o',
  'codeowners-path': '.github/CODEOWNERS',
  'check-name': 'codeowners-approval',
};

beforeEach(() => {
  jest.clearAllMocks();
  (core.getInput as jest.Mock).mockImplementation((name: string) => inputs[name] ?? '');
  (core.getBooleanInput as jest.Mock).mockReturnValue(false);
  (github.getOctokit as jest.Mock).mockReturnValue(octokit);

  // Sensible defaults; individual tests override.
  readCodeownersAtBase.mockResolvedValue('* @alice\n');
  listChangedFiles.mockResolvedValue([{ filename: 'x.ts', status: 'modified' }]);
  deletesCodeowners.mockReturnValue(false);
  getApprovers.mockResolvedValue([]);
  upsertCheckRun.mockResolvedValue(undefined);
  setPayload(DEFAULT_PR);
});

describe('run', () => {
  it('fails the job (no check) when there is no pull_request in the payload', async () => {
    setPayload(null);
    await run();
    expect(core.setFailed).toHaveBeenCalled();
    expect(upsertCheckRun).not.toHaveBeenCalled();
  });

  it('reports success when no changed files are owned', async () => {
    readCodeownersAtBase.mockResolvedValue('/src/ @alice\n');
    listChangedFiles.mockResolvedValue([{ filename: 'docs/readme.md', status: 'modified' }]);
    await run();
    expect(lastCheck().conclusion).toBe('success');
    expect(lastCheck().output.title).toContain('No changed files');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('reports failure when the PR deletes CODEOWNERS', async () => {
    deletesCodeowners.mockReturnValue(true);
    await run();
    expect(lastCheck().conclusion).toBe('failure');
    expect(getApprovers).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('reports success via the author fast path without fetching reviews', async () => {
    readCodeownersAtBase.mockResolvedValue('* @alice\n'); // author owns everything
    await run();
    expect(getApprovers).not.toHaveBeenCalled();
    expect(lastCheck().conclusion).toBe('success');
  });

  it('reports success when a code owner approved', async () => {
    readCodeownersAtBase.mockResolvedValue('* @bob\n'); // author (alice) is not an owner
    getApprovers.mockResolvedValue(['bob']);
    await run();
    expect(getApprovers).toHaveBeenCalled();
    expect(lastCheck().conclusion).toBe('success');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('reports failure with annotations (job stays green) when no code owner approved', async () => {
    readCodeownersAtBase.mockResolvedValue('* @bob\n');
    getApprovers.mockResolvedValue(['erin']); // not an owner
    await run();
    const { conclusion, output } = lastCheck();
    expect(conclusion).toBe('failure');
    expect(output.annotations && output.annotations.length).toBeGreaterThan(0);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('reports a failing check and fails the job on an unexpected error', async () => {
    readCodeownersAtBase.mockRejectedValue(new Error('boom'));
    await run();
    expect(lastCheck().conclusion).toBe('failure');
    expect(lastCheck().output.title).toContain('error');
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
