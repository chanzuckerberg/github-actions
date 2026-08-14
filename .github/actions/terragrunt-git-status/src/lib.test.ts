import { matchOwnedFiles, parseCodeowners } from 'codeowners-approval-check-action/src/codeowners';
import { decide } from 'codeowners-approval-check-action/src/decide';
import { mergeStateMessage, mergeStateRoute, reviewGateRoute } from './lib';

describe('reviewGateRoute', () => {
  it('allows when GitHub reports APPROVED', () => {
    expect(reviewGateRoute('APPROVED')).toBe('allow');
  });

  it('blocks CHANGES_REQUESTED via reviewDecision', () => {
    expect(reviewGateRoute('CHANGES_REQUESTED')).toBe('block-changes');
  });

  it('blocks REVIEW_REQUIRED via reviewDecision (classic require-X)', () => {
    expect(reviewGateRoute('REVIEW_REQUIRED')).toBe('block-review');
  });

  it('falls back to CODEOWNERS when reviewDecision is null', () => {
    expect(reviewGateRoute(null)).toBe('codeowners');
  });
});

describe('mergeStateRoute', () => {
  it('allows a mergeable branch that is level with its base', () => {
    expect(mergeStateRoute(true, 'clean', 0)).toBe('allow');
  });

  it('blocks a branch that is behind its base', () => {
    expect(mergeStateRoute(true, 'behind', 3)).toBe('block-behind');
  });

  it('blocks a conflicted branch', () => {
    expect(mergeStateRoute(false, 'dirty', 0)).toBe('block-conflict');
  });

  it('reports the conflict rather than the lag when a branch is both', () => {
    expect(mergeStateRoute(false, 'dirty', 7)).toBe('block-conflict');
  });

  it('blocks while GitHub has not computed mergeability', () => {
    expect(mergeStateRoute(null, 'unknown', 0)).toBe('block-unknown');
  });

  it('blocks a branch behind its base even before mergeability is known', () => {
    expect(mergeStateRoute(null, 'unknown', 2)).toBe('block-behind');
  });

  it('allows a blocked mergeable_state, which only reflects branch protection', () => {
    expect(mergeStateRoute(true, 'blocked', 0)).toBe('allow');
  });
});

describe('mergeStateMessage', () => {
  it('names the base branch and the lag in commits', () => {
    const message = mergeStateMessage('block-behind', 'main', 3);
    expect(message).toContain('3 commits behind `main`');
  });

  it('uses the singular form for a one-commit lag', () => {
    const message = mergeStateMessage('block-behind', 'main', 1);
    expect(message).toContain('1 commit behind `main`');
    expect(message).not.toContain('1 commits');
  });

  it('names the base branch of a stacked PR', () => {
    const message = mergeStateMessage('block-conflict', 'heathj/base-pr', 0);
    expect(message).toContain('`heathj/base-pr`');
  });
});

describe('CODEOWNERS fallback coverage', () => {
  const codeowners = `
* @org/prod-owners
**/README.md
terraform/envs/dev/*
`;

  function coverage(
    paths: string[],
    approvers: string[],
    ownerLogins: string[],
  ) {
    const owned = matchOwnedFiles(paths, parseCodeowners(codeowners));
    const files = owned.map((file) => ({
      path: file.path,
      pattern: file.pattern,
      ownerTokens: file.owners,
      ownerLogins,
    }));
    return decide({ author: '', approvers, files });
  }

  it('rejects owned prod files with no approval', () => {
    const decision = coverage(
      ['terraform/envs/private-prod/data-artifacts/bucket.tf'],
      [],
      ['alice', 'bob'],
    );
    expect(decision.passed).toBe(false);
    expect(decision.uncovered.map((f) => f.path)).toEqual([
      'terraform/envs/private-prod/data-artifacts/bucket.tf',
    ]);
  });

  it('allows owned files approved by a code owner', () => {
    const decision = coverage(
      ['terraform/envs/private-prod/data-artifacts/bucket.tf'],
      ['alice'],
      ['alice', 'bob'],
    );
    expect(decision.passed).toBe(true);
  });

  it('allows unowned-only / empty-owner rules without approvals', () => {
    const decision = coverage(
      ['terraform/envs/dev/data-artifacts/bucket.tf'],
      [],
      ['alice'],
    );
    expect(decision.totalOwnedFiles).toBe(0);
    expect(decision.passed).toBe(true);
  });

  it('allows when CODEOWNERS is missing (no owned files)', () => {
    const owned = matchOwnedFiles(
      ['terraform/envs/prod/main.tf'],
      parseCodeowners(''),
    );
    const decision = decide({ author: '', approvers: [], files: [] });
    expect(owned).toEqual([]);
    expect(decision.passed).toBe(true);
  });

  it('does not let a non-owner approval cover owned files', () => {
    const decision = coverage(
      ['terraform/envs/prod/main.tf'],
      ['zoe'],
      ['alice', 'bob'],
    );
    expect(decision.passed).toBe(false);
  });
});
