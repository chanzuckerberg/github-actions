import mockFs from 'mock-fs';
import { when } from 'jest-when';
import * as core from '@actions/core';
import {
  determineArgusVaulesFilesToUpdate,
  main,
} from './main';

// mock core to suppress logs
jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('argus-builder-manifest-update', () => {
  describe('main', () => {
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

      await main();

      expect(core.info).toHaveBeenCalledWith('Skipping manifest update because should_deploy is false');
    });

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

      expect(() => main()).rejects.toThrow('We won\'t update the manifest because one or more Docker builds did not succeed');
    });
  });

  describe('determineArgusVaulesFilesToUpdate', () => {
    it('should return empty when no images are provided', () => {
      expect(determineArgusVaulesFilesToUpdate([], ['rdev'])).toEqual([]);
    });

    it('should return empty when no envs are provided', () => {
      mockFs({
        frontend: {
          '.infra': {},
        },
      });

      expect(determineArgusVaulesFilesToUpdate([{
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

      expect(() => determineArgusVaulesFilesToUpdate([{
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
        '.infra': {},
      });

      expect(determineArgusVaulesFilesToUpdate([{
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
          '.infra': {},
        },
        backend: {
          '.infra': {},
        },
      });

      const result = determineArgusVaulesFilesToUpdate(
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
  });

  describe('updateTagsInFile', () => {
    it('should update all relevant tags in a file', () => {
      // TODO
    });
  });
});
