import * as github from '@actions/github';
import { retryTransientErrors, withRetries } from './retry';

// mock core to suppress logs
jest.mock('@actions/core');

const noSleep = jest.fn(async () => {});

// Octokit's HttpError carries the response status; its message is empty when GitHub returns an empty body.
function githubError(status: number): Error {
  return Object.assign(new Error(''), { status });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(status === 500 ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('withRetries', () => {
  beforeEach(() => noSleep.mockClear());

  it('retries a 500 and returns the eventual result', async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(githubError(500))
      .mockRejectedValueOnce(githubError(502))
      .mockResolvedValueOnce('ok');
    expect(await withRetries('test call', call, noSleep)).toBe('ok');
    expect(call).toHaveBeenCalledTimes(3);
    expect(noSleep.mock.calls).toEqual([[2000], [4000]]);
  });

  it('retries rate limiting and requests with no response', async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(githubError(429))
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce('ok');
    expect(await withRetries('test call', call, noSleep)).toBe('ok');
  });

  it('gives up after four attempts with the status in the error', async () => {
    const call = jest.fn().mockRejectedValue(githubError(500));
    await expect(withRetries('test call', call, noSleep)).rejects.toThrow('test call failed with status 500 after 4 attempt(s)');
    expect(call).toHaveBeenCalledTimes(4);
  });

  it('does not retry client errors and rethrows the original error', async () => {
    const original = githubError(404);
    const call = jest.fn().mockRejectedValue(original);
    const thrown = await withRetries('test call', call, noSleep).catch((err) => err);
    expect(thrown).toBe(original);
    expect(thrown).toMatchObject({ status: 404, message: 'test call failed with status 404 after 1 attempt(s): ' });
    expect(call).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });
});

describe('retryTransientErrors', () => {
  beforeEach(() => noSleep.mockClear());

  it('retries any request the client makes when GitHub returns a 500', async () => {
    const fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse(500, null))
      .mockResolvedValueOnce(jsonResponse(200, [{ number: 1, state: 'open' }]));
    const octokit = retryTransientErrors(github.getOctokit('token', { request: { fetch } }), noSleep);

    const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({ owner: 'o', repo: 'r', commit_sha: 'abc' });

    expect(result.data).toEqual([{ number: 1, state: 'open' }]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledTimes(1);
  });

  it('passes client errors through with their status and the route in the message', async () => {
    const fetch = jest.fn().mockResolvedValue(jsonResponse(404, { message: 'Not Found' }));
    const octokit = retryTransientErrors(github.getOctokit('token', { request: { fetch } }), noSleep);

    const thrown = await octokit.rest.pulls.get({ owner: 'o', repo: 'r', pull_number: 1 }).catch((err) => err);

    expect(thrown.status).toBe(404);
    expect(thrown.message).toContain('GitHub API GET /repos/{owner}/{repo}/pulls/{pull_number} failed with status 404 after 1 attempt(s)');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
