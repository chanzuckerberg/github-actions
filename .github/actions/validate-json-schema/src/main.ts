import * as core from '@actions/core';
// import * as github from '@actions/github';
// import { execSync } from 'node:child_process';

import Ajv from 'ajv';

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

export async function main() {
  const inputs = getInputs();
  core.info(`Received input: ${JSON.stringify(inputs, null, 2)}`);

  const ajv = new Ajv();
  const { data, schema } = inputs;
  
  core.info(`Validating JSON against schema: ${JSON.stringify(schema, null, 2)}`);
  core.info(`Input data: ${JSON.stringify(data, null, 2)}`);
  
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new Error(`JSON is invalid: ${ajv.errorsText(validate.errors)}`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
