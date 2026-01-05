import mockFs from 'mock-fs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { when } from 'jest-when';
import * as core from '@actions/core';
import {
  determineValuesFilesToUpdate,
  main,
  updateValuesFiles,
} from './main';

// mock core to suppress logs
jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('argus-builder-manifest-update', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('main', () => {
    it('should throw error when any build_results are not success', async () => {
      when(mockedCore.getBooleanInput)
        .calledWith('should_deploy', { required: true })
        .mockReturnValue(true);
      when(mockedCore.getInput)
        .calledWith('build_results', { required: true })
        .mockReturnValue('success,failure');
      when(mockedCore.getInput)
        .calledWith('envs', { required: true })
        .mockReturnValue('rdev');
      when(mockedCore.getInput)
        .calledWith('images', { required: true })
        .mockReturnValue(JSON.stringify([{
          name: 'frontend',
          argus_root: 'frontend',
          context: 'frontend',
          dockerfile: 'frontend/Dockerfile',
          platform: 'linux/arm64',
          build_args: '',
          secret_files: '',
          files_matched: true,
          branch_matched: true,
          should_build: true,
        }]));

      // pass through to original core.group implementation
      jest.spyOn(core, 'group').mockImplementation((arg, arg2) => jest.requireActual('@actions/core').group(arg, arg2));

      expect(() => main()).rejects.toThrow('We won\'t update the manifest because one or more Docker builds did not succeed');
    });

    it('should not run when should_deploy is false', async () => {
      when(mockedCore.getBooleanInput)
        .calledWith('should_deploy', { required: true })
        .mockReturnValue(false);
      when(mockedCore.getInput)
        .calledWith('build_results', { required: true })
        .mockReturnValue('success');
      when(mockedCore.getInput)
        .calledWith('envs', { required: true })
        .mockReturnValue('rdev');
      when(mockedCore.getInput)
        .calledWith('images', { required: true })
        .mockReturnValue(JSON.stringify([{
          name: 'frontend',
          argus_root: 'frontend',
          context: 'frontend',
          dockerfile: 'frontend/Dockerfile',
          platform: 'linux/arm64',
          build_args: '',
          secret_files: '',
          files_matched: true,
          branch_matched: true,
          should_build: true,
        }]));

      // pass through to original core.group implementation
      jest.spyOn(core, 'group').mockImplementation((arg, arg2) => jest.requireActual('@actions/core').group(arg, arg2));

      await main();

      expect(core.info).toHaveBeenCalledWith('> Skipping manifest update because should_deploy is false');
    });

    describe('when a build did not succeed and should_deploy is false', () => {
      // this ensures that a failing build error takes precedence over should_deploy
      it('should throw error ', async () => {
        when(mockedCore.getBooleanInput)
          .calledWith('should_deploy', { required: true })
          .mockReturnValue(false);
        when(mockedCore.getInput)
          .calledWith('build_results', { required: true })
          .mockReturnValue('success,failure');
        when(mockedCore.getInput)
          .calledWith('envs', { required: true })
          .mockReturnValue('rdev');
        when(mockedCore.getInput)
          .calledWith('images', { required: true })
          .mockReturnValue(JSON.stringify([{
            name: 'frontend',
            argus_root: 'frontend',
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            platform: 'linux/arm64',
            build_args: '',
            secret_files: '',
            files_matched: true,
            branch_matched: true,
            should_build: true,
          }]));

        // pass through to original core.group implementation
        jest.spyOn(core, 'group').mockImplementation((arg, arg2) => jest.requireActual('@actions/core').group(arg, arg2));

        expect(() => main()).rejects.toThrow('We won\'t update the manifest because one or more Docker builds did not succeed');
      });
    });
  });

  describe('determineArgusVaulesFilesToUpdate', () => {
    it('should return empty when no images are provided', () => {
      expect(determineValuesFilesToUpdate([], ['rdev'])).toEqual([]);
    });

    it('should return empty when no envs are provided', () => {
      mockFs({
        frontend: {
          '.infra': {},
        },
      });

      expect(determineValuesFilesToUpdate([{
        name: 'frontend',
        argus_root: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }], [])).toEqual([]);
    });

    it('should throw an error when no .infra dir is found', () => {
      mockFs({
        frontend: {},
      });

      expect(() => determineValuesFilesToUpdate([{
        name: 'frontend',
        argus_root: 'frontend',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }], ['rdev'])).toThrow('.infra directory not found at frontend/.infra');
    });

    it('should return the correct values for a simple example', () => {
      mockFs({
        '.infra': {
          rdev: {
            'values.yaml': '',
          },
        },
      });

      expect(determineValuesFilesToUpdate([{
        name: 'frontend',
        argus_root: '.',
        context: 'frontend',
        dockerfile: 'frontend/Dockerfile',
        platform: 'linux/arm64',
        build_args: '',
        secret_files: '',
        files_matched: true,
        branch_matched: true,
        should_build: true,
      }], ['rdev'])).toEqual(['.infra/rdev/values.yaml']);
    });

    it('should return the correct values for a more complex example', () => {
      mockFs({
        frontend: {
          '.infra': {
            staging: {
              'values.yaml': '',
            },
            prod: {
              'values.yaml': '',
            },
          },
        },
        backend: {
          '.infra': {
            staging: {
              'values.yaml': '',
            },
            prod: {
              'values.yaml': '',
            },
          },
        },
      });

      const result = determineValuesFilesToUpdate(
        [
          {
            name: 'frontend',
            argus_root: 'frontend',
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            platform: 'linux/arm64',
            build_args: '',
            secret_files: '',
            files_matched: true,
            branch_matched: true,
            should_build: true,
          },
          {
            name: 'backend',
            argus_root: 'backend',
            context: 'backend',
            dockerfile: 'backend/Dockerfile',
            platform: 'linux/arm64',
            build_args: '',
            secret_files: '',
            files_matched: true,
            branch_matched: true,
            should_build: true,
          },
        ],
        ['staging', 'prod'],
      );

      expect(result.sort()).toEqual([
        'frontend/.infra/staging/values.yaml',
        'frontend/.infra/prod/values.yaml',
        'backend/.infra/staging/values.yaml',
        'backend/.infra/prod/values.yaml',
      ].sort());
    });

    it('should not include files that don\'t exist', () => {
      mockFs({
        frontend: {
          '.infra': {
            staging: {
              'values.yaml': '',
            },
          },
        },
        backend: {
          '.infra': {
            staging: {
              'values.yaml': '',
            },
            prod: {
              'values.yaml': '',
            },
          },
        },
      });

      const result = determineValuesFilesToUpdate(
        [
          {
            name: 'frontend',
            argus_root: 'frontend',
            context: 'frontend',
            dockerfile: 'frontend/Dockerfile',
            platform: 'linux/arm64',
            build_args: '',
            secret_files: '',
            files_matched: true,
            branch_matched: true,
            should_build: true,
          },
          {
            name: 'backend',
            argus_root: 'backend',
            context: 'backend',
            dockerfile: 'backend/Dockerfile',
            platform: 'linux/arm64',
            build_args: '',
            secret_files: '',
            files_matched: true,
            branch_matched: true,
            should_build: true,
          },
        ],
        ['staging', 'prod'],
      );

      expect(result.sort()).toEqual([
        'frontend/.infra/staging/values.yaml',
        'backend/.infra/staging/values.yaml',
        'backend/.infra/prod/values.yaml',
      ].sort());
    });
  });

  describe('updateValuesFiles', () => {
    let tempFilePath: string;

    beforeEach(() => {
      tempFilePath = path.join(os.tmpdir(), 'values.yaml');
    });

    afterEach(() => {
      fs.unlinkSync(tempFilePath);
    });

    it('should update all relevant tags in a file', () => {
      const initialValuesFileContents = `tag: sha-XYZ
anchor:
  tag: &image-tag sha-XYZ
thing: *image-tag
nested:
  tag: sha-XYZ
another:
  tag: blah
quoted:
  tag: "sha-XYZ"
img-arr:
  - image:
      tag: sha-XYZ
  - image:
      tag: blah
  - image:
      tag: "sha-XYZ"
tag-arr:
  - tag: sha-XYZ
  - tag: blah
  - tag: "sha-1234"
raw-arr:
  - sha-1234
  - blah
  - "sha-1234"
`;

      const expectedUpdatedValuesFileContents = `tag: sha-ABC
anchor:
  tag: &image-tag sha-ABC
thing: *image-tag
nested:
  tag: sha-ABC
another:
  tag: blah
quoted:
  tag: "sha-ABC"
img-arr:
  - image:
      tag: sha-ABC
  - image:
      tag: blah
  - image:
      tag: "sha-ABC"
tag-arr:
  - tag: sha-ABC
  - tag: blah
  - tag: "sha-ABC"
raw-arr:
  - sha-1234
  - blah
  - "sha-1234"
`;

      fs.writeFileSync(tempFilePath, initialValuesFileContents);
      expect(fs.existsSync(tempFilePath)).toBe(true);

      updateValuesFiles([tempFilePath], 'sha-ABC');

      expect(fs.readFileSync(tempFilePath).toString()).toEqual(expectedUpdatedValuesFileContents);
    });
  });
});
