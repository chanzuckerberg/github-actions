import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  authorityKey,
  read,
  claim,
  release,
  reap,
  scanClaims,
  releaseByPr,
} from './lib';

const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('authorityKey', () => {
  it('builds the expected key', () => {
    expect(authorityKey('org/repo', 'terraform/envs/dev')).toBe(
      'authority/org/repo/terraform/envs/dev',
    );
  });
});

describe('read', () => {
  it('returns exists=false when no item', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });
    const client = new DynamoDBClient({});
    const result = await read(client, 'table', 'org/repo', 'stack');
    expect(result.exists).toBe(false);
  });

  it('returns the record when item exists', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: {
        LockID: { S: 'authority/org/repo/stack' },
        OwnerRef: { S: 'pr' },
        PrNumber: { S: '42' },
        PrSha: { S: 'abc123' },
        Actor: { S: 'user' },
        ClaimedAt: { S: '2026-01-01T00:00:00.000Z' },
      },
    });
    const client = new DynamoDBClient({});
    const result = await read(client, 'table', 'org/repo', 'stack');
    expect(result.exists).toBe(true);
    expect(result.record).toEqual({
      ownerRef: 'pr',
      prNumber: '42',
      prSha: 'abc123',
      actor: 'user',
      claimedAt: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('claim', () => {
  it('succeeds when no existing record', async () => {
    ddbMock.on(PutItemCommand).resolves({});
    const client = new DynamoDBClient({});
    const result = await claim(
      client,
      'table',
      'org/repo',
      'stack',
      '10',
      'sha1',
      'actor1',
    );
    expect(result.claimed).toBe(true);
    expect(result.blockedByPr).toBe('');
  });

  it('fails when another PR owns the stack', async () => {
    ddbMock.on(PutItemCommand).rejects(
      new ConditionalCheckFailedException({
        message: 'condition failed',
        $metadata: {},
      }),
    );
    ddbMock.on(GetItemCommand).resolves({
      Item: {
        LockID: { S: 'authority/org/repo/stack' },
        OwnerRef: { S: 'pr' },
        PrNumber: { S: '99' },
        PrSha: { S: 'other' },
        Actor: { S: 'other-user' },
        ClaimedAt: { S: '2026-01-01T00:00:00.000Z' },
      },
    });
    const client = new DynamoDBClient({});
    const result = await claim(
      client,
      'table',
      'org/repo',
      'stack',
      '10',
      'sha1',
      'actor1',
    );
    expect(result.claimed).toBe(false);
    expect(result.blockedByPr).toBe('99');
  });
});

describe('release', () => {
  it('deletes the authority row', async () => {
    ddbMock.on(DeleteItemCommand).resolves({});
    const client = new DynamoDBClient({});
    await release(client, 'table', 'org/repo', 'stack');

    const calls = ddbMock.commandCalls(DeleteItemCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.Key).toEqual({
      LockID: { S: 'authority/org/repo/stack' },
    });
  });
});

describe('scanClaims', () => {
  it('returns all PR-owned records and omits main-owned rows', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          LockID: { S: 'authority/org/repo/stack-a' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '10' },
          PrSha: { S: 'sha1' },
          Actor: { S: 'user1' },
          ClaimedAt: { S: '2026-01-01T00:00:00.000Z' },
        },
        {
          LockID: { S: 'authority/org/repo/stack-b' },
          OwnerRef: { S: 'main' },
        },
      ],
    });
    const client = new DynamoDBClient({});
    const result = await scanClaims(client, 'table', 'org/repo');

    expect(result).toHaveLength(1);
    expect(result[0].stack).toBe('stack-a');
    expect(result[0].record.prNumber).toBe('10');
  });

  it('returns empty array when no claims exist', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    const client = new DynamoDBClient({});
    const result = await scanClaims(client, 'table', 'org/repo');
    expect(result).toHaveLength(0);
  });
});

describe('releaseByPr', () => {
  it('releases only stacks owned by the given PR', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          LockID: { S: 'authority/org/repo/stack-a' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '42' },
          PrSha: { S: 'sha1' },
          Actor: { S: 'user1' },
          ClaimedAt: { S: '2026-01-01T00:00:00.000Z' },
        },
        {
          LockID: { S: 'authority/org/repo/stack-b' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '99' },
          PrSha: { S: 'sha2' },
          Actor: { S: 'user2' },
          ClaimedAt: { S: '2026-01-01T00:00:00.000Z' },
        },
      ],
    });
    ddbMock.on(DeleteItemCommand).resolves({});

    const client = new DynamoDBClient({});
    const released = await releaseByPr(client, 'table', 'org/repo', '42');

    expect(released).toEqual(['stack-a']);
    const deleteCalls = ddbMock.commandCalls(DeleteItemCommand);
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].args[0].input.Key).toEqual({
      LockID: { S: 'authority/org/repo/stack-a' },
    });
  });

  it('returns empty array when no stacks are owned by the PR', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    const client = new DynamoDBClient({});
    const released = await releaseByPr(client, 'table', 'org/repo', '42');
    expect(released).toEqual([]);
  });
});

describe('reap', () => {
  it('reaps claims older than max age', async () => {
    const oldDate = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const freshDate = new Date().toISOString();

    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          LockID: { S: 'authority/org/repo/old-stack' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '1' },
          ClaimedAt: { S: oldDate },
        },
        {
          LockID: { S: 'authority/org/repo/fresh-stack' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '2' },
          ClaimedAt: { S: freshDate },
        },
      ],
    });
    ddbMock.on(DeleteItemCommand).resolves({});

    const client = new DynamoDBClient({});
    const result = await reap(client, 'table', 'org/repo', 30);

    expect(result.reaped).toEqual(['old-stack']);
    expect(result.skipped).toEqual(['fresh-stack']);
  });

  it('reaps claims with no ClaimedAt', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          LockID: { S: 'authority/org/repo/broken-stack' },
          OwnerRef: { S: 'pr' },
          PrNumber: { S: '5' },
        },
      ],
    });
    ddbMock.on(DeleteItemCommand).resolves({});

    const client = new DynamoDBClient({});
    const result = await reap(client, 'table', 'org/repo', 30);

    expect(result.reaped).toEqual(['broken-stack']);
    expect(result.skipped).toEqual([]);
  });

  it('skips main-owned rows', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          LockID: { S: 'authority/org/repo/main-stack' },
          OwnerRef: { S: 'main' },
        },
      ],
    });

    const client = new DynamoDBClient({});
    const result = await reap(client, 'table', 'org/repo', 30);

    expect(result.reaped).toEqual([]);
    expect(result.skipped).toEqual([]);
  });
});
