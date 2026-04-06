import { ECRClient } from '@aws-sdk/client-ecr';
import { createRepositoryIfNotExist, putLifecyclePolicy, setRepositoryPolicy } from './ecr';

jest.mock('@actions/core');

const mockSend = jest.fn();
const client = { send: mockSend } as unknown as ECRClient;

beforeEach(() => {
  mockSend.mockReset();
});

describe('createRepositoryIfNotExist', () => {
  it('returns existing repository without creating', async () => {
    mockSend.mockResolvedValueOnce({
      repositories: [{ repositoryUri: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-repo' }],
    });

    const result = await createRepositoryIfNotExist(client, 'my-repo');

    expect(result.repositoryUri).toBe('123456789.dkr.ecr.us-west-2.amazonaws.com/my-repo');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('creates repository when it does not exist', async () => {
    const notFound = new Error('RepositoryNotFoundException');
    notFound.name = 'RepositoryNotFoundException';
    mockSend.mockRejectedValueOnce(notFound);
    mockSend.mockResolvedValueOnce({
      repository: { repositoryUri: '123456789.dkr.ecr.us-west-2.amazonaws.com/new-repo' },
    });

    const result = await createRepositoryIfNotExist(client, 'new-repo');

    expect(result.repositoryUri).toBe('123456789.dkr.ecr.us-west-2.amazonaws.com/new-repo');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('rethrows unexpected errors', async () => {
    const unexpected = new Error('AccessDeniedException');
    unexpected.name = 'AccessDeniedException';
    mockSend.mockRejectedValueOnce(unexpected);

    await expect(createRepositoryIfNotExist(client, 'my-repo')).rejects.toThrow('AccessDeniedException');
  });
});

describe('putLifecyclePolicy', () => {
  it('reads file and sends PutLifecyclePolicyCommand', async () => {
    // eslint-disable-next-line global-require
    const fs = require('node:fs');
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('{"rules":[]}');
    mockSend.mockResolvedValueOnce({});

    await putLifecyclePolicy(client, 'my-repo', '/tmp/lifecycle.json');

    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/lifecycle.json', { encoding: 'utf-8' });
    expect(mockSend).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });
});

describe('setRepositoryPolicy', () => {
  it('reads file and sends SetRepositoryPolicyCommand', async () => {
    // eslint-disable-next-line global-require
    const fs = require('node:fs');
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('{"Version":"2012-10-17"}');
    mockSend.mockResolvedValueOnce({});

    await setRepositoryPolicy(client, 'my-repo', '/tmp/repo-policy.json');

    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/repo-policy.json', { encoding: 'utf-8' });
    expect(mockSend).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });
});
