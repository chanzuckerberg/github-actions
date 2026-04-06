import * as core from '@actions/core';
import { ECRClient } from '@aws-sdk/client-ecr';
import { createRepositoryIfNotExist, putLifecyclePolicy, setRepositoryPolicy } from './ecr';

type Inputs = {
  repository: string;
  lifecyclePolicy: string | undefined;
  repositoryPolicy: string | undefined;
};

export function getInputs(): Inputs {
  return {
    repository: core.getInput('repository', { required: true }),
    lifecyclePolicy: core.getInput('lifecycle-policy') || undefined,
    repositoryPolicy: core.getInput('repository-policy') || undefined,
  };
}

export async function main() {
  const inputs = getInputs();
  core.info(`Received inputs: ${JSON.stringify(inputs, null, 2)}`);

  const client = new ECRClient({});
  const repo = await createRepositoryIfNotExist(client, inputs.repository);
  if (inputs.lifecyclePolicy) await putLifecyclePolicy(client, inputs.repository, inputs.lifecyclePolicy);
  if (inputs.repositoryPolicy) await setRepositoryPolicy(client, inputs.repository, inputs.repositoryPolicy);

  core.setOutput('repository-uri', repo.repositoryUri);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
