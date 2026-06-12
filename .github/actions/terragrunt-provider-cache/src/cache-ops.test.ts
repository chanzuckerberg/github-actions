import * as core from '@actions/core';
import { run } from './cache-ops';

jest.mock('@actions/core');
jest.mock('@actions/exec', () => ({
  getExecOutput: jest.fn(),
  exec: jest.fn(),
}));

describe('run', () => {
  beforeEach(() => {
    jest.mocked(core.getInput).mockReset();
    jest.mocked(core.setFailed).mockImplementation(() => undefined);
  });

  it('rejects unknown operation', async () => {
    jest.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'operation') return 'nope';
      if (name === 'provider-cache-bucket') return 'b';
      if (name === 'provider-cache-key') return 'k';
      if (name === 'cache-dir') return '/tmp/c';
      return '';
    });

    await expect(run()).rejects.toThrow(
      /operation must be "restore" or "upload"/,
    );
  });
});
