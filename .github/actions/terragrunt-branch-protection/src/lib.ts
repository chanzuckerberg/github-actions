import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

interface BranchProtectionRule {
  id: string;
  pattern: string;
  requiredStatusCheckContexts: string[];
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

export async function ensureBranchProtection(
  octokit: Octokit,
  statusCheckName: string,
): Promise<void> {
  const { owner, repo } = context.repo;

  const result: RepoQueryResult = await octokit.graphql(`
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
            requiredStatusCheckContexts
          }
        }
      }
    }
  `, { owner, name: repo });

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

  if (rule) {
    const currentContexts = rule.requiredStatusCheckContexts || [];
    if (currentContexts.includes(statusCheckName)) {
      core.info(`Required check OK: ${statusCheckName} already required on ${defaultBranch}`);
      return;
    }

    await octokit.graphql(`
      mutation($ruleId: ID!, $contexts: [String!]!) {
        updateBranchProtectionRule(input: {
          branchProtectionRuleId: $ruleId
          requiredStatusCheckContexts: $contexts
        }) {
          branchProtectionRule { id }
        }
      }
    `, {
      ruleId: rule.id,
      contexts: [...currentContexts, statusCheckName],
    });
    core.info(`Added ${statusCheckName} to required status checks on ${defaultBranch}`);
  } else {
    await octokit.graphql(`
      mutation($repoId: ID!, $pattern: String!, $contexts: [String!]!) {
        createBranchProtectionRule(input: {
          repositoryId: $repoId
          pattern: $pattern
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
}
