import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  ECRClient,
  PutLifecyclePolicyCommand,
  SetRepositoryPolicyCommand,
} from '@aws-sdk/client-ecr';
import type { Repository } from '@aws-sdk/client-ecr';

export type CreateResult = {
  repositoryUri: string;
};

const isRepositoryNotFoundException = (e: unknown): boolean => e instanceof Error && e.name === 'RepositoryNotFoundException';

export async function createRepositoryIfNotExist(
  client: ECRClient,
  name: string,
): Promise<CreateResult> {
  try {
    const describe = await client.send(
      new DescribeRepositoriesCommand({ repositoryNames: [name] }),
    );
    const found = describe.repositories?.[0] as Repository;
    core.info(`Repository ${found.repositoryUri} already exists`);
    return { repositoryUri: found.repositoryUri! };
  } catch (error) {
    if (isRepositoryNotFoundException(error)) {
      const create = await client.send(
        new CreateRepositoryCommand({ repositoryName: name }),
      );
      const repo = create.repository as Repository;
      core.info(`Repository ${repo.repositoryUri} has been created`);
      return { repositoryUri: repo.repositoryUri! };
    }
    throw error;
  }
}

export async function putLifecyclePolicy(
  client: ECRClient,
  repositoryName: string,
  path: string,
): Promise<void> {
  const lifecyclePolicyText = readFileSync(path, { encoding: 'utf-8' });
  await client.send(
    new PutLifecyclePolicyCommand({ repositoryName, lifecyclePolicyText }),
  );
  core.info(`Put lifecycle policy ${path} on repository ${repositoryName}`);
}

export async function setRepositoryPolicy(
  client: ECRClient,
  repositoryName: string,
  path: string,
): Promise<void> {
  const policyText = readFileSync(path, { encoding: 'utf-8' });
  await client.send(
    new SetRepositoryPolicyCommand({ repositoryName, policyText }),
  );
  core.info(`Set repository policy ${path} on repository ${repositoryName}`);
}
