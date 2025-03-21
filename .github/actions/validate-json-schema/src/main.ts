import * as core from '@actions/core';
import { validateJsonSchema } from './validateJsonSchema';

type Inputs = {
  data: object
  schema: object
};

export function getInputs(): Inputs {
  return {
    data: JSON.parse(core.getInput('data', { required: true })),
    schema: JSON.parse(core.getInput('schema', { required: true })),
  };
}

export function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  const { data, schema } = inputs;

  validateJsonSchema(data, schema);
  core.info('JSON is valid');
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
