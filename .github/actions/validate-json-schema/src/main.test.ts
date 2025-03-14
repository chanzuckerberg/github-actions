import { when } from 'jest-when';
import * as core from '@actions/core';
import { main, getInputs } from './main';

jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('getInputs', () => {
  it('should load and parse inputs', async () => {
    when(mockedCore.getInput)
      .calledWith('envs', { required: true })
      .mockReturnValue('prod,prod,staging');
    // when(mockedCore.getInput)
    //   .calledWith('argus_project_dirs', { required: true })
    //   .mockReturnValue('rdev');

    // await main();
    const inputs = getInputs();

    expect(mockedCore.getInput).toHaveBeenCalledWith('envs', { required: true });
    // expect(mockedCore.getInput).toHaveBeenCalledWith('envName', { required: true });

    expect(inputs).toEqual({ envs: ['prod', 'staging'] });
  });
});

describe('main', () => {
  it('should update tags in yaml files', async () => {
    when(mockedCore.getInput)
      .calledWith('envs', { required: true })
      .mockReturnValue('prod,prod,staging');
    // when(mockedCore.getInput)
    //   .calledWith('argus_project_dirs', { required: true })
    //   .mockReturnValue('rdev');

    await main();

    // expect(mockedCore.info).toHaveBeenCalledWith('Received CREATE event: {\n  "envs": [\n    "prod",\n    "staging"\n  ]\n}');
    // expect(mockedCore.info).toHaveBeenCalledWith('...> envs', ['prod', 'staging']);
  });
});