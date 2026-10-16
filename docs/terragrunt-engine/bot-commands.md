---
---

# Bot commands

[Documentation home](../index.md) · [Terragrunt Engine overview](index.md)

Comment on a pull request in a repository that has configured the [apply caller workflow](getting-started.md#apply-from-pr-comments-and-pushes-to-main).
The caller passes the comment to the engine, which parses the command and decides whether to proceed.

## `@terragrunt-bot apply-and-merge`

```text
@terragrunt-bot apply-and-merge [--times=N] [--refresh=true|false]
```

| Option | Default | Description |
| --- | --- | --- |
| `--times=N` | `1` | Allows up to `N` attempts per stack, from 1 through 5, stopping after that stack's first successful apply. |
| `--refresh=true` or `--refresh=false` | Inherits the workflow's `refresh` input | Overrides Terraform refresh behavior for this apply. With the default `auto` input, comment-triggered applies use `-refresh=false`. |

For example, `@terragrunt-bot apply-and-merge --times=2 --refresh=true` allows two attempts per stack and enables refresh.
Retries rerun the apply command; they do not roll back a partially completed apply.
Unknown arguments, duplicate options, and values outside the supported ranges are rejected.

### Preconditions

Before accepting the command, the engine checks that:

- The person commenting has write or admin access to the repository.
- The PR meets its review requirements.
- The PR is ready for review rather than a draft.
- The PR has no merge conflicts and is up to date with its base branch.
- GitHub has finished determining whether the PR can merge cleanly.

For reviews, the engine uses GitHub's review decision when one is available.
Otherwise, it checks approvals against `.github/CODEOWNERS` on the base branch for the changed files.
If there is no CODEOWNERS file or no changed files match an ownership rule, that fallback allows the command without requiring an approval.

Once accepted, the engine checks out the validated PR commit, merges the latest base branch into its working tree, and stops if that merge conflicts.
It claims the selected stacks and runs an apply for each.
These applies run Terraform again; they do not apply a saved plan from the earlier PR plan run.

After all stacks apply successfully, the engine attempts a squash merge using GitHub auto-merge, with a direct squash-merge fallback when GitHub reports that the PR is already mergeable.
Other required checks or a merge error can leave the PR waiting or unmerged after a successful apply.
Failed applies are reported in a PR comment and the apply status.

> **TODO: Team procedures**
>
> Confirm any additional production approval requirements, who handles failed applies, and when engineers should request help.

## `@terragrunt-bot unlock`

Use this command to recover from a state lock left behind by a previous run.
It requires write or admin access, but does not perform the apply command's review and merge-readiness checks.

For the stacks changed by the PR, it force-removes the DynamoDB state-lock rows found in the Terraform S3 backend configuration and releases the engine's stack ownership claims.
It does not run an apply or merge the PR.

> **⚠️ Check for an active run first**
>
> This is a force-unlock operation that bypasses lock-owner checks.
> Confirm that no Terraform or Terragrunt run is still using the affected state before using it.

The custom cleanup supports S3 backends with a readable `dynamodb_table` configuration; it does not clear native S3 lockfiles or locks for other backend types.

> **TODO: Team procedures**
>
> Confirm who may authorize force-unlocking production state and the team's recovery and escalation process.

## `@terragrunt-bot help`

Posts or updates the bot's help comment with the available commands and their options.
It does not run Terraform or change stack ownership.
Missing or unknown commands produce a response listing the supported commands.

## Implementation references

- [Command parsing and options](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L91-L133).
- [Review checks](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L545-L705) and [apply validation](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L806-L872).
- [Apply execution](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L278-L456), [merge handling](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L299-L440), and [unlock job](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L504-L563).
