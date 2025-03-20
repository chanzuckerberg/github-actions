import * as core from '@actions/core';
import Ajv from 'ajv';

export function validateJsonSchema(data: object, schema: object) {
  const ajv = new Ajv();
  core.info(`Validating JSON against schema: ${JSON.stringify(schema, null, 2)}`);
  core.info(`Input data: ${JSON.stringify(data, null, 2)}`);

  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new Error(`JSON is invalid: ${ajv.errorsText(validate.errors)}`);
  }
}
