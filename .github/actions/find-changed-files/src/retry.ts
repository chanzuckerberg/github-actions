import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;
export type Sleep = (ms: number) => Promise<void>;

const maxAttempts = 4;
const baseDelayMs = 2000;

const defaultSleep: Sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function isTransientGitHubError(status: number | undefined): boolean {
  // No status means the request never got a response.
  return status === undefined || status === 429 || status >= 500;
}

// withRetries retries a call that fails transiently, with exponential backoff. The final error is
// rethrown as-is, so callers can still inspect its type and status, but with the status added to its
// message, since Octokit's message is empty when GitHub returns an empty error body.
export async function withRetries<T>(
  description: string,
  call: () => Promise<T>,
  sleep: Sleep = defaultSleep,
  attempt = 1,
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const { status } = err as { status?: number };
    const statusText = status === undefined ? 'no response' : `status ${status}`;
    if (!isTransientGitHubError(status) || attempt >= maxAttempts) {
      if (err instanceof Error) {
        // eslint-disable-next-line no-param-reassign
        err.message = `${description} failed with ${statusText} after ${attempt} attempt(s): ${err.message}`;
      }
      throw err;
    }
    const delayMs = baseDelayMs * 2 ** (attempt - 1);
    core.warning(`${description} failed with ${statusText}; retrying in ${delayMs / 1000}s (attempt ${attempt} of ${maxAttempts})`);
    await sleep(delayMs);
    return withRetries(description, call, sleep, attempt + 1);
  }
}

// retryTransientErrors makes every request the client sends retry transient GitHub errors.
export function retryTransientErrors<T extends Octokit>(octokit: T, sleep: Sleep = defaultSleep): T {
  octokit.hook.wrap('request', (request, options) => withRetries(
    `GitHub API ${options.method} ${options.url}`,
    async () => request(options),
    sleep,
  ));
  return octokit;
}
