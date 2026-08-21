import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

interface BranchProtectionRule {
  id: string;
  pattern: string;
  requiresStatusChecks: boolean;
  requiredStatusCheckContexts: string[];
}

export type GateState =
  | 'enforced'
  | 'missing-rule'
  | 'checks-disabled'
  | 'context-missing';

// gateEnforcement reports whether a branch protection rule actually blocks a
// merge on the engine's status check. GitHub stores requiredStatusCheckContexts
// independently of the requiresStatusChecks toggle and ignores the contexts
// while the toggle is off, so both have to be read to know the gate is live.
export function gateEnforcement(
  rule: Pick<BranchProtectionRule, 'requiresStatusChecks' | 'requiredStatusCheckContexts'> | undefined,
  statusCheckName: string,
): GateState {
  if (!rule) {
    return 'missing-rule';
  }
  if (!rule.requiresStatusChecks) {
    return 'checks-disabled';
  }
  if (!(rule.requiredStatusCheckContexts || []).includes(statusCheckName)) {
    return 'context-missing';
  }
  return 'enforced';
}

export function gateEnforcementMessage(
  state: GateState,
  branch: string,
  statusCheckName: string,
): string {
  const prefix = `Branch protection on \`${branch}\` does not require `
    + `\`${statusCheckName}\`, so an unapplied pull request can still merge.`;
  if (state === 'missing-rule') {
    return `${prefix} No protection rule matches \`${branch}\`.`;
  }
  if (state === 'checks-disabled') {
    return `${prefix} The rule exists but required status checks are turned off.`;
  }
  return `${prefix} The rule requires status checks but not this one.`;
}

interface RepoQueryResult {
  repository: {
    id: string;
    defaultBranchRef: {
      name: string;
    };
    autoMergeAllowed: boolean;
    squashMergeAllowed: boolean;
    mergeCommitAllowed: boolean;
    rebaseMergeAllowed: boolean;
    branchProtectionRules: {
      nodes: BranchProtectionRule[];
    };
  };
}

const repoQuery = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      defaultBranchRef { name }
      autoMergeAllowed
      squashMergeAllowed
      mergeCommitAllowed
      rebaseMergeAllowed
      branchProtectionRules(first: 100) {
        nodes {
          id
          pattern
          requiresStatusChecks
          requiredStatusCheckContexts
        }
      }
    }
  }
`;

export async function ensureBranchProtection(
  octokit: Octokit,
  statusCheckName: string,
): Promise<void> {
  const { owner, repo } = context.repo;

  const result: RepoQueryResult = await octokit.graphql(repoQuery, { owner, name: repo });

  const repoData = result.repository;
  const defaultBranch = repoData.defaultBranchRef.name;

  core.info(`Repository: ${owner}/${repo}, default branch: ${defaultBranch}`);

  await ensureRepoSettings(octokit, repoData);
  await ensureRequiredCheck(octokit, repoData, defaultBranch, statusCheckName);
}

async function ensureRepoSettings(
  octokit: Octokit,
  repoData: RepoQueryResult['repository'],
): Promise<void> {
  const { owner, repo } = context.repo;
  const changes: Record<string, boolean> = {};

  if (!repoData.autoMergeAllowed) changes.allow_auto_merge = true;
  if (!repoData.squashMergeAllowed) changes.allow_squash_merge = true;
  if (repoData.mergeCommitAllowed) changes.allow_merge_commit = false;
  if (repoData.rebaseMergeAllowed) changes.allow_rebase_merge = false;

  if (Object.keys(changes).length === 0) {
    core.info('Repo settings OK: auto-merge enabled, squash-only merges');
    return;
  }

  await octokit.rest.repos.update({ owner, repo, ...changes });

  const descriptions: string[] = [];
  if (changes.allow_auto_merge) descriptions.push('enabled auto-merge');
  if (changes.allow_squash_merge) descriptions.push('enabled squash merge');
  if (changes.allow_merge_commit === false) descriptions.push('disabled merge commits');
  if (changes.allow_rebase_merge === false) descriptions.push('disabled rebase merge');
  core.info(`Fixed repo settings: ${descriptions.join(', ')}`);
}

async function ensureRequiredCheck(
  octokit: Octokit,
  repoData: RepoQueryResult['repository'],
  defaultBranch: string,
  statusCheckName: string,
): Promise<void> {
  const rules = repoData.branchProtectionRules.nodes;
  const rule = rules.find((r) => r.pattern === defaultBranch);

  if (gateEnforcement(rule, statusCheckName) === 'enforced') {
    core.info(`Required check OK: ${statusCheckName} already required on ${defaultBranch}`);
    return;
  }

  if (rule) {
    const contexts = rule.requiredStatusCheckContexts || [];
    await octokit.graphql(`
      mutation($ruleId: ID!, $contexts: [String!]!) {
        updateBranchProtectionRule(input: {
          branchProtectionRuleId: $ruleId
          requiresStatusChecks: true
          requiredStatusCheckContexts: $contexts
        }) {
          branchProtectionRule { id }
        }
      }
    `, {
      ruleId: rule.id,
      contexts: contexts.includes(statusCheckName)
        ? contexts
        : [...contexts, statusCheckName],
    });
    core.info(`Added ${statusCheckName} to required status checks on ${defaultBranch}`);
  } else {
    await octokit.graphql(`
      mutation($repoId: ID!, $pattern: String!, $contexts: [String!]!) {
        createBranchProtectionRule(input: {
          repositoryId: $repoId
          pattern: $pattern
          requiresStatusChecks: true
          requiredStatusCheckContexts: $contexts
        }) {
          branchProtectionRule { id }
        }
      }
    `, {
      repoId: repoData.id,
      pattern: defaultBranch,
      contexts: [statusCheckName],
    });
    core.info(`Created branch protection on ${defaultBranch} with ${statusCheckName} required`);
  }

  await verifyRequiredCheck(octokit, defaultBranch, statusCheckName);
}

const gateWarningMarker = '<!-- terragrunt-engine:gate-not-enforced -->';

// GitHub accepts a branch protection mutation that sets contexts without
// enabling required status checks and silently discards the contexts, so the
// written rule is read back rather than trusted. A gate that cannot be enforced
// is reported on the pull request rather than failing the job, because the
// apply itself is still safe to run and blocking it would strand the PR.
async function verifyRequiredCheck(
  octokit: Octokit,
  defaultBranch: string,
  statusCheckName: string,
): Promise<void> {
  const { owner, repo } = context.repo;
  const result: RepoQueryResult = await octokit.graphql(repoQuery, { owner, name: repo });
  const rule = result.repository.branchProtectionRules.nodes
    .find((r) => r.pattern === defaultBranch);
  const state = gateEnforcement(rule, statusCheckName);

  if (state === 'enforced') {
    core.info(`Verified ${statusCheckName} is required on ${defaultBranch}`);
    return;
  }

  const message = gateEnforcementMessage(state, defaultBranch, statusCheckName);
  core.warning(`${message} The engine wrote the rule and GitHub did not keep it.`);
  await reportGateNotEnforced(octokit, message);
}

async function reportGateNotEnforced(
  octokit: Octokit,
  message: string,
): Promise<void> {
  const prNumber = context.payload.issue?.number ?? context.payload.pull_request?.number;
  if (typeof prNumber !== 'number') {
    return;
  }

  const body = [
    gateWarningMarker,
    message,
    '',
    'The apply below still runs and the pull request can still merge. What is '
    + 'missing is the guard that stops someone merging Terraform that was never '
    + 'applied.',
    '',
    'The engine tried to set this rule itself and GitHub did not keep it. That '
    + 'usually means the terragrunt-bot GitHub App is not granted administration '
    + 'write on this repository, or a repository ruleset overrides the rule. Ask '
    + 'the platform team to fix it once and this comment goes away.',
  ].join('\n');

  const { owner, repo } = context.repo;
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  const existing = comments.find(
    (c) => c.user?.type === 'Bot' && c.body?.includes(gateWarningMarker),
  );

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner, repo, comment_id: existing.id, body,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner, repo, issue_number: prNumber, body,
  });
}
