# Getting started

## Prerequisites

Before adding caller workflows, the repository needs:

- Terraform components and a Terragrunt configuration that can run from each selected stack directory.
- A stack layout matching the engine's defaults, or overrides for `stack_paths`, `stack_dirs`, and `trigger_all_paths`.
- Access to the `terragrunt-bot` GitHub App and its `TERRAGRUNT_BOT_APP_ID` and `TERRAGRUNT_BOT_PK` secrets.
- App access to any private repositories used as Terraform module sources.
- A runner matching the configured label, which defaults to `amd64`.
- AWS OIDC trust for the CI role, permission to assume the cache and infrastructure roles, and the backend resources those roles access.
- Terraform backend configuration and any non-AWS provider credentials required by its components.

See [Inputs reference](inputs.md) for configuration and secret conventions, and [Authentication and state](authentication-and-state.md) for the credential flow and backend details.
The engine's shared defaults are CZI configuration; adopting another repository or organization requires checking its access rather than assuming those defaults will work.

!!! todo "Onboarding process"
    Confirm who installs the GitHub App, grants access to organization secrets and runners, and provisions or approves AWS roles and state resources.
    Add the team's onboarding instructions and contacts once confirmed.

## Caller workflows

A repo adopts the engine with thin caller workflows.
The examples below use `chanzuckerberg/shared-infra` as a reference implementation.

### Plan on pull requests

Create a file under `.github/workflows/` in the repository containing your infrastructure.
This complete example uses the engine's default configuration, as the plan caller in `chanzuckerberg/shared-infra` does.
It plans changes when a pull request is opened, updated, or reopened.
The `closed` event releases any stack ownership held by the pull request.

```yaml
# .github/workflows/terragrunt-plan.yml
name: Plan infrastructure changes

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  contents: read
  id-token: write

concurrency:
  group: plan-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  plan:
    uses: chanzuckerberg/github-actions/.github/workflows/terragrunt-engine.yml@v6
    secrets: inherit
    with:
      action: plan -lock=false
      set_apply_gate: true
```

### Apply from PR comments and pushes to main

Create `.github/workflows/terragrunt-apply.yml` in the repository containing your infrastructure, alongside the plan workflow.
This example follows the working [apply caller in `shared-infra`](https://github.com/chanzuckerberg/shared-infra/blob/main/.github/workflows/terragrunt_apply.yml).
It handles bot commands on PRs and applies infrastructure changes pushed to `main`.
Adjust the branch and Terraform paths to match your repository.

```yaml
# .github/workflows/terragrunt-apply.yml
name: Apply infrastructure changes

on:
  push:
    paths:
      - "terraform/envs/**"
      - "terraform/accounts/**"
      - "terraform/global/**"
      - "terraform/modules/**"
    branches:
      - main
  issue_comment:
    types: [created]

permissions:
  contents: read
  id-token: write

concurrency:
  group: apply-${{ github.event_name == 'issue_comment' && github.event.issue.number || 'main' }}
  cancel-in-progress: false

jobs:
  apply:
    if: >-
      github.event_name != 'issue_comment' || (
        github.event.issue.pull_request &&
        github.event.comment.user.type != 'Bot' &&
        contains(github.event.comment.body, '@terragrunt-bot')
      )
    uses: chanzuckerberg/github-actions/.github/workflows/terragrunt-engine.yml@v6
    secrets: inherit
    with:
      action: apply
```

- `issue_comment` listens for new comments; the job's `if` condition accepts PR comments that mention `@terragrunt-bot` and come from a human user.
  The engine then parses the command and performs the required permission and PR checks.
- `push` runs an apply when changes reach `main` under one of the listed Terraform paths, including after a PR is merged.
- `permissions` allows the workflow to read the repository and request a GitHub OIDC token for AWS authentication.
- `concurrency` allows one running apply per PR or `main` group, without cancelling an apply already in progress.
- `secrets: inherit` passes the calling repository's available secrets to the engine.
- `action: apply` tells the engine to run Terragrunt applies on the selected stacks.

## Branch protection

The plan caller sets `set_apply_gate: true` so the engine posts the `terragrunt-apply` status on the PR.
If stacks changed, that status stays pending until a successful `apply-and-merge` run reports success.
If no stacks changed, it passes automatically.
The status blocks merging only when branch protection requires it.

When an `apply-and-merge` command is accepted, the engine's branch-protection action enables auto-merge and squash merging, disables merge commits and rebase merging, and adds the apply status to a protection rule for the default branch.
It creates or updates an exact-name rule for that branch using the bot's App token.
These are repository-setting changes performed by the engine, not settings implied by the caller's `permissions` block.

If the action cannot verify that the required check is enforced after writing the rule, it warns in the logs and on the PR rather than stopping the apply for that reason.
Existing rulesets, bypass permissions, and App installation permissions still need review before relying on the gate.
The checks performed before applying are described in [Bot commands](bot-commands.md#preconditions).

!!! todo "Repository policy review"
    Confirm the intended production review requirements, branch rules and bypass permissions with the team before adopting the engine.
    Have Jake review this section against the repository's actual settings.

Sources: [gate status](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L224-L260), [branch-protection enforcement](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-branch-protection/src/lib.ts#L89-L217), and [dispatch integration](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L156-L186).

## Scheduled and manual runs

The engine exposes `workflow_call`; each repository chooses whether to add scheduled or manual callers.
The reference repository has these additional workflows:

| Caller in `shared-infra` | Trigger | Operation |
| --- | --- | --- |
| [terragrunt_apply_all.yml](https://github.com/chanzuckerberg/shared-infra/blob/main/.github/workflows/terragrunt_apply_all.yml) | Daily at 10:00 UTC, or manually through `workflow_dispatch` | `action: apply` with `all_stacks: true`. |
| [terragrunt_plan_all.yml](https://github.com/chanzuckerberg/shared-infra/blob/main/.github/workflows/terragrunt_plan_all.yml) | Manually through `workflow_dispatch` | `action: plan -lock=false` with `all_stacks: true`. |
| [terragrunt_reap_authority.yml](https://github.com/chanzuckerberg/shared-infra/blob/main/.github/workflows/terragrunt_reap_authority.yml) | On the 1st and 16th of each month at 12:00 UTC, or manually | Calls the stack-authority action directly to release closed or stale PR claims. |

The scheduled apply uses the default branch, refreshes state under the default `refresh: auto` behavior, and applies the configured infrastructure across the selected stacks.
It can correct drift by changing live resources; it is not just a drift report.
Stack ownership checks still block applies to stacks controlled by another PR.
Manual all-stacks runs use the branch selected for that workflow run.
These callers do not use the bot command's PR validation path.

The PR and main-branch apply example uses separate concurrency groups from the all-stacks caller, so the callers do not provide a single global apply queue.
See [Authentication and state](authentication-and-state.md#concurrency-and-locking) for how the different coordination mechanisms fit together.

!!! todo "Team procedures"
    Confirm who can start manual or scheduled applies against production and how the team monitors and handles drift-correction failures.
