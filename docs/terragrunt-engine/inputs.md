# Inputs reference

Inputs to the `terragrunt-engine.yml` reusable workflow. The source of truth is
the `on.workflow_call.inputs` block in `.github/workflows/terragrunt-engine.yml`.

!!! todo
    Consider generating this page from the workflow file so it cannot drift.

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `action` | string | required | TODO |
| `refresh` | string | `auto` | TODO |
| `all_stacks` | boolean | `false` | TODO |
| `runner` | string | `amd64` | TODO |
| `aws_region` | string | `us-west-2` | TODO |
| `ci_role_arn` | string | | TODO |
| `cache_role_arn` | string | | TODO |
| `provider_cache_bucket` | string | `terragrunt-engine-state` | TODO |
| `terraform_version` | string | `1.9.8` | TODO |
| `terragrunt_version` | string | `v1.0.0` | TODO |
| `stack_paths` | string | `terraform/envs`, `terraform/accounts` | TODO |
| `stack_dirs` | string | `terraform/global` | TODO |
| `trigger_all_paths` | string | `terraform/modules` | TODO |
| `claim_authority` | boolean | `false` | TODO |
| `skip_pr_owned` | boolean | `true` | TODO |
| `release_authority` | boolean | `false` | TODO |
| `auto_merge_on_success` | boolean | `false` | TODO |
| `set_apply_gate` | boolean | `false` | TODO |
| `status_check_name` | string | `terragrunt-apply` | TODO |
| `authority_table` | string | `terragrunt-engine-state-lock` | TODO |

## Secrets

Pass secrets with `secrets: inherit`. The engine discovers them by name.

| Secret | Purpose |
| --- | --- |
| `TERRAGRUNT_BOT_APP_ID` | TODO |
| `TERRAGRUNT_BOT_PK` | TODO |
| `TF_ENV_<NAME>` | TODO |
| `TF_VAR_<name>` | TODO |
