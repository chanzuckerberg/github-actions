---
---

# Inputs

[Documentation home](../index.md) · [Terragrunt Engine](index.md)

Pass inputs through the caller job's `with` block.
The [workflow's input definitions](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/workflows/terragrunt-engine.yml#L6-L145) are the source of truth.

| Input | Default | Description |
| --- | --- | --- |
| `action` | required | Command passed to Terragrunt, such as `plan -lock=false` or `apply`. |
| `refresh` | `auto` | `auto` adds `-refresh=false` for PR and comment runs; `true` or `false` sets refresh for every run. |
| `all_stacks` | `false` | Run every stack instead of only the changed ones. |
| `runner` | `amd64` | Runner label for the engine's jobs. |
| `aws_region` | `us-west-2` | Region for the engine's AWS credentials and claim table. |
| `ci_role_arn` | `arn:aws:iam::416703108729:role/terragrunt-engine-ci` | Role assumed through GitHub OIDC, and used to run Terragrunt. |
| `cache_role_arn` | `arn:aws:iam::533267185808:role/tfe-si` | Role assumed from the CI role for the provider cache, stack claims, and lock cleanup. |
| `provider_cache_bucket` | `terragrunt-engine-state` | S3 bucket for the shared provider cache. It does not configure the state backend. |
| `terraform_version` | `1.9.8` | Terraform version to install. |
| `terragrunt_version` | `v1.0.0` | Terragrunt release to install. |
| `stack_paths` | `terraform/envs` and `terraform/accounts` | Directories whose immediate subdirectories are stacks, one per line. |
| `stack_dirs` | `terraform/global` | Additional stack directories, one per line. Missing ones are skipped. |
| `trigger_all_paths` | `terraform/modules` | Shared-module directories, one per line. See below. |
| `set_apply_gate` | `false` | Set the `terragrunt-apply` status after finding stacks. Enable it in the plan caller. |
| `skip_pr_owned` | `true` | Check stack claims: applies fail for stacks another PR has claimed, and plans only warn. |
| `claim_authority` | `false` | Claim stacks for the PR before running. Comment-triggered applies always claim. |
| `release_authority` | `false` | Release claims after a successful run outside PR comments. |
| `auto_merge_on_success` | `false` | In PR context, report the result and, after success, release claims and merge. Comment-triggered applies always do this. |
| `status_check_name` | `terragrunt-apply` | Name of the apply status. Keep the default: the initial pending status always uses `terragrunt-apply`. |
| `authority_table` | `terragrunt-engine-state-lock` | DynamoDB table for stack claims. |

The engine runs `terragrunt run --all --non-interactive -- <action> <refresh flag> -no-color` from each stack directory.
The bot's `--refresh` option overrides the `refresh` input.

## Secrets

Pass secrets with `secrets: inherit`; the engine finds them by name.

| Secret | Purpose |
| --- | --- |
| `TERRAGRUNT_BOT_APP_ID`, `TERRAGRUNT_BOT_PK` | GitHub App credentials used for comments, statuses, merges, repository settings, and private module downloads. |
| `TF_ENV_<NAME>` | Exported as the environment variable `<NAME>`, for example `TF_ENV_OKTA_API_TOKEN` becomes `OKTA_API_TOKEN`. |
| `TF_VAR_<name>` | Exported unchanged, so Terraform reads it as `var.<name>`. |

Every stack receives every matching secret; secrets cannot be scoped to one stack.

## How stacks are selected

A changed file selects the stack directory that contains it, for example `terraform/envs/prod`.
A change under a `trigger_all_paths` directory, such as `terraform/modules/vpc`, selects every stack with a module `source` ending in `/modules/vpc`.
That match only looks at `.tf` files at each stack's root and one level below.
A stack directory deleted by the PR is dropped from the selection; nothing runs `destroy`, so its resources are left in place.
