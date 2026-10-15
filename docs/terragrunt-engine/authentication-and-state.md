# Authentication and state

This page describes the credential and state paths present in the checked source.
Repository and AWS settings deployed in a particular environment must still be verified when adopting the engine.

## GitHub authentication

The engine creates GitHub App installation tokens using `TERRAGRUNT_BOT_APP_ID` and `TERRAGRUNT_BOT_PK`.
It uses these tokens for bot comments, status updates, PR checks and merges, repository settings, and private module access.
The workflow rewrites Git module URLs during the job so private module downloads can use an App token.
The App must be installed on the repositories the job needs to read.

The branch-protection code calls repository administration APIs in addition to the APIs used for comments and merges.
Team-based CODEOWNERS checks may also need permission to read team membership.
The checked repositories do not establish the complete permissions of the installed GitHub App.

!!! todo "Onboarding process"
    Confirm the App owner, installation process, exact App permissions, and how repositories receive its secrets.

Sources: [token creation and module authentication](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L270-L326) and [repository-setting updates](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-branch-protection/src/lib.ts#L89-L189).

## AWS authentication

The caller grants `id-token: write`, allowing the job to request a GitHub OIDC token.
The engine uses `aws-actions/configure-aws-credentials` to assume `ci_role_arn` through OIDC.
It then assumes `cache_role_arn` through role chaining for the provider cache and stack ownership operations.
Before executing Terragrunt, it obtains the CI role credentials again.
Terraform providers and the backend then use that job's credentials and any additional role assumptions configured in the infrastructure repository.
Cleanup and finalization use the cache role for their shared-resource operations.

The default chain is:

```text
GitHub OIDC -> terragrunt-engine-ci -> tfe-si for cache and ownership
           -> terragrunt-engine-ci -> configured backend/provider roles
```

The `shared-infra` [CI role definition](https://github.com/chanzuckerberg/shared-infra/blob/main/terraform/accounts/czi-id/terragrunt-engine-ci-role.tf) configures access for repositories under `chanzuckerberg` and a `job_workflow_ref` condition for the shared engine and authority-reaper workflows.
It grants `sts:AssumeRole` and `sts:TagSession` on roles named `tfe-si` across AWS accounts.
The referenced [cztack module at v0.128.0](https://github.com/chanzuckerberg/cztack/blob/v0.128.0/aws-iam-role-github-action/main.tf) creates the GitHub federated trust statements and their repository and additional claim conditions.
This source does not authorize the `evolutionaryscale` GitHub organization through the default repository mapping.

The destination role needs its own trust policy permitting the source identity, as well as policies granting access to the resources Terraform manages.
The reference [tfe-si role](https://github.com/chanzuckerberg/shared-infra/blob/main/terraform/modules/aws-account-complete/role-tfe-si.tf) trusts the configured CZI identity account and attaches `AdministratorAccess`.
That is the existing configuration, rather than a minimal permission policy for a new repository.
Its [cztack cross-account module](https://github.com/chanzuckerberg/cztack/blob/v0.47.0/aws-iam-role-crossacct/main.tf) delegates trust generation to [aws-assume-role-policy](https://github.com/chanzuckerberg/cztack/blob/v0.47.0/aws-assume-role-policy/main.tf).

The default role names and trust configuration are not evidence that a new repository already has access.
Confirm the deployed OIDC provider, trust conditions, role policies, and destination roles before integration.

Source: [engine AWS credential steps](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L327-L403).

## Provider credentials and inputs

AWS providers can assume target-account roles configured in their Terraform provider blocks.
For other providers, the engine exports inherited secrets matching `TF_ENV_<NAME>` as environment variable `<NAME>`.
Secrets matching `TF_VAR_<name>` become Terraform input-variable environment variables unchanged.
Exported values are masked, and the matching secrets are available to every executing stack job rather than selected by stack name.
See [Inputs reference](inputs.md#secrets) for examples.

## Terraform state

The infrastructure repository configures its Terraform backend.
The engine does not create that backend or select a state key through a workflow input.
In particular, `provider_cache_bucket` controls the provider cache even when its value happens to name the same bucket as the backend.

The reference [route53 component backend](https://github.com/chanzuckerberg/shared-infra/blob/main/terraform/envs/prod/route53/fogg.tf#L112-L125) uses:

| Setting | Existing reference value |
| --- | --- |
| Backend | `s3` |
| Bucket | `terragrunt-engine-state` |
| State key | `terraform/si/envs/prod/components/route53.tfstate` |
| Region | `us-west-2` |
| Lock table | `terragrunt-engine-state-lock` |
| Encryption setting | `encrypt = true` |
| Backend role | `arn:aws:iam::533267185808:role/tfe-si` |

Each component needs the correct state location for its own existing resources; copying another component's key would point at that component's state.
The [core-platform-infra backend resource](https://github.com/chanzuckerberg/core-platform-infra/blob/main/terraform/envs/prod/terragrunt-state/main.tf) declares the shared bucket and lock-table resources through the Cloud Posse backend module at version `1.4.0`.
The deployed bucket's settings, backups, and current contents were not inspected as part of writing these docs.

## Concurrency and locking

Three mechanisms serve different purposes:

| Mechanism | Purpose |
| --- | --- |
| Caller workflow concurrency | Limits overlapping runs within the caller's configured group, such as a PR number or the main-branch group. |
| Terraform state lock | Protects a component's state while Terraform operates on it. The reference backend uses DynamoDB locking. |
| Engine stack ownership | Reserves an entire selected stack for a PR across runs. See [Stack authority](stack-authority.md). |

The engine itself does not define a global workflow concurrency group.
The reference PR, main-branch, and scheduled callers use different groups, so one group does not serialize all engine invocations.
PR plans explicitly pass `-lock=false`; applies use the backend's normal locking behavior.

After execution, the custom cleanup action checks DynamoDB state locks and normally uses runner identity and creation time to avoid deleting another run's lock.
Lock rows with missing or unparsable metadata are an exception that it may delete without those checks.
The explicit `unlock` command bypasses ownership checks and also releases engine stack claims.
See [Bot commands](bot-commands.md#terragrunt-bot-unlock) before using it.

The cleanup parser requires literal S3 backend settings for bucket, key, region, and DynamoDB table in readable `.tf` files.
It does not clear native S3 lockfiles or state locks for other backends.
The engine defaults to Terraform `1.9.8`; adopting native S3 locking would require a compatible Terraform version and changes to this cleanup path.

Sources: [reference caller concurrency](https://github.com/chanzuckerberg/shared-infra/blob/main/.github/workflows/terragrunt_apply.yml#L19-L21), [cleanup job](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L494-L503), [cleanup ownership checks and backend parser](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-release-locks/src/lib.ts#L61-L136), and [DynamoDB lock deletion](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-release-locks/src/index.ts#L63-L128).

## Applies and production controls

The bot command checks the commenter's write access, review requirements, and the PR's readiness before applying.
It uses the validated PR commit and attempts to incorporate the latest base branch before execution.
The apply status and required branch check coordinate applying before merging.
Other invocation paths, including a push to `main` or a scheduled caller, do not run the comment command's PR checks.
The shared workflow does not declare a GitHub deployment environment with a production approval gate.

See [Getting started](getting-started.md#branch-protection) for branch protection and [Bot commands](bot-commands.md#preconditions) for the implemented PR checks.

!!! todo "Review with Jake"
    Confirm deployed IAM and GitHub App permissions, production review and bypass rules, manual-run access, state recovery expectations, and whether native S3 locking is planned.
    Document who owns onboarding and incident recovery after those procedures are confirmed.
