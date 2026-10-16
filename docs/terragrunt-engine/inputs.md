---
---

# Inputs reference

[Documentation home](../index.md) · [Terragrunt Engine overview](index.md)

Inputs to the `terragrunt-engine.yml` reusable workflow.
The source of truth is the [workflow's input definitions](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L6-L145) and the code paths that consume them.
Pass overrides through the caller job's `with` block.

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `action` | string | Required; no default | Terraform operation and flags passed through Terragrunt, such as `plan -lock=false` or `apply`. The caller selects the operation; the engine does not infer it from the event. |
| `refresh` | string | `auto` | `auto` adds `-refresh=false` for PR and comment runs, leaving Terraform's default behavior for other events. `true` or `false` explicitly sets `-refresh` for any run. |
| `all_stacks` | boolean | `false` | Select every configured stack instead of only stacks affected by the change. Used by scheduled and manual all-stacks callers. |
| `runner` | string | `amd64` | GitHub Actions runner label for the engine's jobs. The repository needs access to a runner with that label. |
| `aws_region` | string | `us-west-2` | Region used when configuring engine AWS credentials and accessing the authority table; providers and backends may have their own region settings. |
| `ci_role_arn` | string | `arn:aws:iam::416703108729:role/terragrunt-engine-ci` | Initial AWS role assumed using GitHub OIDC and restored before running Terragrunt. Its trust policy must admit the calling repository and workflow. |
| `cache_role_arn` | string | `arn:aws:iam::533267185808:role/tfe-si` | Role assumed from the CI role for the S3 provider cache, stack authority, and DynamoDB state-lock cleanup. |
| `provider_cache_bucket` | string | `terragrunt-engine-state` | S3 bucket for the shared provider cache. This input does not configure Terraform's state backend. |
| `terraform_version` | string | `1.9.8` | Terraform version installed for the run; it must satisfy the infrastructure repository's version constraints. |
| `terragrunt_version` | string | `v1.0.0` | Terragrunt release installed from `gruntwork-io/terragrunt`. |
| `stack_paths` | string | `terraform/envs` and `terraform/accounts`, on separate lines | Base directories whose immediate children are stacks. Supply multiple paths as a YAML multiline string. |
| `stack_dirs` | string | `terraform/global` | Explicit stack directories outside or within the base-path layout, supplied one per line. Missing directories are skipped. |
| `trigger_all_paths` | string | `terraform/modules` | Shared-module directories, one per line. Changes select stacks whose Terraform module sources match the changed module names. |
| `claim_authority` | boolean | `false` | Explicitly claim selected stacks for the PR before execution. Comment-triggered applies already claim automatically; claiming requires PR context. |
| `skip_pr_owned` | boolean | `true` | Check stack ownership. Applies fail for stacks owned by another PR; plans warn but proceed. The name does not mean that a conflicting apply silently succeeds. |
| `release_authority` | boolean | `false` | Release each stack after successful execution for runs outside `issue_comment`, when `auto_merge_on_success` is false. Comment applies release through `finalize` instead. |
| `auto_merge_on_success` | boolean | `false` | Enable finalization and a merge attempt after successful execution in PR context. `apply-and-merge` enables this path automatically without an explicit input override. |
| `set_apply_gate` | boolean | `false` | Set the PR's apply status after discovery: pending if stacks changed, success if none changed. Enable this in the PR plan caller. |
| `status_check_name` | string | `terragrunt-apply` | Status name used by the gate, finalizer, and branch-protection action. Keep the default unless a custom name has been verified end to end. |
| `authority_table` | string | `terragrunt-engine-state-lock` | DynamoDB table for stack ownership records. See [Stack authority](stack-authority.md). |

The execution command is `terragrunt run --all --non-interactive -- <action> <refresh flags> -no-color`, run from each selected stack directory.
The `action` input is a command string, not an enumeration of plan and apply choices.
The bot's `--refresh` option takes precedence over the workflow's `refresh` input.

The apply-validation action currently posts its initial pending status using the literal name `terragrunt-apply`, even when `status_check_name` is customized.
That is why this guide uses the default status name throughout.

## How stacks are selected

With the defaults, `terraform/envs/prod` and `terraform/accounts/example-account` are stacks, and `terraform/global` is an explicitly named stack.
Changing a component under `terraform/envs/prod` selects the containing `prod` stack, so Terragrunt runs across that stack's components.
Directories deleted by a PR are removed from the selection; deleting a directory does not run a destroy for its resources.

For shared-module changes, discovery scans `.tf` files at each stack root and one directory below it for literal module sources ending in `/modules/<module-name>`.
It is not a complete Terraform dependency graph, so repositories with other layouts or module source patterns need to verify their stack selection.

See the [discovery action](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-changed-stacks/src/main.ts#L44-L77) and its [layout and module-matching helpers](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-changed-stacks/src/lib.ts#L16-L127).

## Secrets

Pass secrets with `secrets: inherit`.
The engine discovers them by name.

| Secret | Purpose |
| --- | --- |
| `TERRAGRUNT_BOT_APP_ID` | GitHub App identifier used when creating installation tokens for the bot. |
| `TERRAGRUNT_BOT_PK` | GitHub App private key used to create those tokens. |
| `TF_ENV_<NAME>` | Exported as environment variable `<NAME>` for provider credentials or other provider configuration; for example, `TF_ENV_OKTA_API_TOKEN` becomes `OKTA_API_TOKEN`. |
| `TF_VAR_<name>` | Exported unchanged as a Terraform input variable environment variable. |

The workflow declares the two bot secrets as optional, but its token-creation steps use them during normal execution.
The provider-secret action masks exported values and ignores `GITHUB_TOKEN`.
It exports the matching inherited secrets into each executing stack job; it does not choose different credentials by stack.

See [Authentication and state](authentication-and-state.md), the [provider-secret exporter](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-provider-secrets/src/main.ts#L13-L59), and the [apply status initialization](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L853-L860).
