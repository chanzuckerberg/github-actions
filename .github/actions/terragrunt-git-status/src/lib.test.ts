import { matchOwnedFiles, parseCodeowners } from 'codeowners-approval-check-action/src/codeowners';
import { decide } from 'codeowners-approval-check-action/src/decide';
import { reviewGateRoute } from './lib';

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
