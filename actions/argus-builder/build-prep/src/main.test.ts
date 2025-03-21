import { when } from 'jest-when';
import * as core from '@actions/core';
import { findMatchingChangedFiles, isLabelOnPullRequest, isMatchingBranch, wildcardMatch } from './main';

jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('validate-json-schema', () => {
  describe('wildcardMatch', () => {
    it('should match exact string', () => {
      expect(wildcardMatch('test', 'test')).toBe(true);
    });

    it('should match wildcard', () => {
      expect(wildcardMatch('test', 't*')).toBe(true);
    });

    it('should not match', () => {
      expect(wildcardMatch('test', 't')).toBe(false);
    });


    it('should match wildcards with extra characters', () => {
      expect(wildcardMatch('test', 't*st')).toBe(true);
    });

    it('should match multiple wildcards', () => {
      expect(wildcardMatch('testing', 't*t*g')).toBe(true);
    });
  });

  describe('isMatchingBranch', () => {
    it('should match exact branch', () => {
      expect(isMatchingBranch({
        branchesInclude: ['main'],
        branchesIgnore: [],
        branch: 'main',
      })).toBe(true);
    });

    it('should match wildcard branch', () => {
      expect(isMatchingBranch({
        branchesInclude: ['*'],
        branchesIgnore: [],
        branch: 'feature/test',
      })).toBe(true);
    });

    it('should not match wildcard branch with exclusion', () => {
      expect(isMatchingBranch({
        branchesInclude: ['*'],
        branchesIgnore: ['feature/*'],
        branch: 'feature/test',
      })).toBe(false);
    });
  });

  describe('findMatchingChangedFiles', () => {
    it('should match path', () => {
      expect(findMatchingChangedFiles(['src/main.ts'], [['src/main.ts']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts'], [['src/*.ts']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts'], [['**/*']])).toEqual(['src/main.ts']);
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['src/*.ts']])).toEqual(['src/main.ts', 'src/test.ts']);
      expect(findMatchingChangedFiles(['lib/main.ts', 'src/test.ts'], [['lib/*.ts'], ['src/test.ts']])).toEqual(['lib/main.ts', 'src/test.ts']);
    });

    it('should not match', () => {
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['lib/*.ts']])).toEqual([]);
      expect(findMatchingChangedFiles(['src/main.ts', 'src/test.ts'], [['src/*.ts', '!src/test.ts']])).toEqual(['src/main.ts']);
    });
  });

  describe('isLabelOnPullRequest', () => {
    it('should match label', () => {
      expect(isLabelOnPullRequest(['testlabel'], ['testlabel'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel', 'testlabel2'])).toBe(true);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['test*'])).toBe(true);
    });

    it('should not match label', () => {
      expect(isLabelOnPullRequest([], ['testlabel'])).toBe(false);
      expect(isLabelOnPullRequest(['testlabel'], ['testlabel2'])).toBe(false);
      expect(isLabelOnPullRequest(['testlabel', 'testlabel2'], ['testlabel3'])).toBe(false);
    });
  });
});
