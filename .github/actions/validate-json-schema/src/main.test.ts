import { when } from 'jest-when';
import * as core from '@actions/core';
import { main } from './main';

jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('validate-json-schema', () => {
  it('should succeed when data matches schema [simple]', () => {
    when(mockedCore.getInput)
      .calledWith('data', { required: true })
      .mockReturnValue(JSON.stringify('testvalue'));
    when(mockedCore.getInput)
      .calledWith('schema', { required: true })
      .mockReturnValue(JSON.stringify({ type: 'string' }));

    main();
  });

  it('should fail when data does not match schema [simple]', async () => {
    when(mockedCore.getInput)
      .calledWith('data', { required: true })
      .mockReturnValue(JSON.stringify({ key: 'value' }));
    when(mockedCore.getInput)
      .calledWith('schema', { required: true })
      .mockReturnValue(JSON.stringify({ type: 'string' }));

    await expect(async () => main()).rejects.toThrow('JSON is invalid: data must be string');
  });

  it('should succeed when data matches schema [complex]', () => {
    when(mockedCore.getInput)
      .calledWith('data', { required: true })
      .mockReturnValue(JSON.stringify({
        key: 'value',
        nested: {
          key: 'value',
        },
      }));
    when(mockedCore.getInput)
      .calledWith('schema', { required: true })
      .mockReturnValue(JSON.stringify({
        type: 'object',
        properties: {
          key: { type: 'string' },
          nested: {
            type: 'object',
            properties: {
              key: { type: 'string' },
            },
          },
        },
        required: ['key', 'nested'],
      }));

    main();
  });

  it('should fail when data does not match schema [complex]', async () => {
    when(mockedCore.getInput)
      .calledWith('data', { required: true })
      .mockReturnValue(JSON.stringify({
        key: 'value',
        nested: {},
      }));
    when(mockedCore.getInput)
      .calledWith('schema', { required: true })
      .mockReturnValue(JSON.stringify({
        type: 'object',
        properties: {
          key: { type: 'string' },
          nested: {
            type: 'object',
            properties: {
              key: { type: 'string' },
            },
            required: ['key'],
          },
        },
        required: ['key', 'nested'],
      }));

    await expect(async () => main()).rejects.toThrow("JSON is invalid: data/nested must have required property 'key'");
  });
});
