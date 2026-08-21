import { gateEnforcement, gateEnforcementMessage } from './lib';

describe('gateEnforcement', () => {
  it('accepts a rule that requires the check', () => {
    expect(gateEnforcement({
      requiresStatusChecks: true,
      requiredStatusCheckContexts: ['terragrunt-apply'],
    }, 'terragrunt-apply')).toBe('enforced');
  });

  it('rejects contexts that GitHub kept with the toggle off', () => {
    expect(gateEnforcement({
      requiresStatusChecks: false,
      requiredStatusCheckContexts: ['terragrunt-apply'],
    }, 'terragrunt-apply')).toBe('checks-disabled');
  });

  it('rejects a rule that requires other checks but not this one', () => {
    expect(gateEnforcement({
      requiresStatusChecks: true,
      requiredStatusCheckContexts: ['fogg-apply'],
    }, 'terragrunt-apply')).toBe('context-missing');
  });

  it('rejects an empty context list, which is what a dropped write leaves', () => {
    expect(gateEnforcement({
      requiresStatusChecks: false,
      requiredStatusCheckContexts: [],
    }, 'terragrunt-apply')).toBe('checks-disabled');
  });

  it('reports a missing rule', () => {
    expect(gateEnforcement(undefined, 'terragrunt-apply')).toBe('missing-rule');
  });
});

describe('gateEnforcementMessage', () => {
  it('names the branch and the check in every case', () => {
    const states = ['missing-rule', 'checks-disabled', 'context-missing'] as const;
    states.forEach((state) => {
      const message = gateEnforcementMessage(state, 'main', 'terragrunt-apply');
      expect(message).toContain('`main`');
      expect(message).toContain('`terragrunt-apply`');
    });
  });

  it('distinguishes a disabled toggle from a missing context', () => {
    expect(gateEnforcementMessage('checks-disabled', 'main', 'terragrunt-apply'))
      .toContain('turned off');
    expect(gateEnforcementMessage('context-missing', 'main', 'terragrunt-apply'))
      .toContain('not this one');
  });
});
