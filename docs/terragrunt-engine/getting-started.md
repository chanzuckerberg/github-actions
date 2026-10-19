---
---

# Getting started

[Documentation home](../index.md) · [Terragrunt Engine](index.md)

## Prerequisites

- **Stack layout.**
  By default, stacks are the directories directly under `terraform/envs` and `terraform/accounts`, plus `terraform/global`.
  Other layouts need the `stack_paths`, `stack_dirs`, and `trigger_all_paths` [inputs](inputs.md).
  Each stack must run under `terragrunt run --all`.
- **GitHub App.**
  The `terragrunt-bot` App must be installed on the repository and on any private repositories used as module sources.
  Its `TERRAGRUNT_BOT_APP_ID` and `TERRAGRUNT_BOT_PK` secrets must be available to the repository.
- **Runner.**
  Use the `runner` input to choose which runner label the engine's jobs run on; the default is `amd64` (as of October 2026).
- **AWS access.**
  The CI role (`ci_role_arn`) must trust the repository through GitHub OIDC and be able to assume the cache role and the roles your backend and providers use.
  The defaults point at CZI's shared roles.
- **Backend.**
  An S3 backend with a DynamoDB lock table, set in your Terraform code.
  The engine's lock cleanup does not yet handle native S3 lockfiles (`use_lockfile`).

## Plan on pull requests

<!-- {% raw %} -->

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

<!-- {% endraw %} -->

- `set_apply_gate: true` posts the `terragrunt-apply` status described under [Branch protection](#branch-protection).
- The `closed` event releases any stack claims the PR still holds.
- Plans pass `-lock=false`, so they never wait on or leave behind a state lock.

## Apply from PR comments and pushes to main

<!-- {% raw %} -->

```yaml
# .github/workflows/terragrunt-apply.yml
name: Apply infrastructure changes

on:
  push:
    branches: [main]
    paths:
      - "terraform/envs/**"
      - "terraform/accounts/**"
      - "terraform/global/**"
      - "terraform/modules/**"
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

<!-- {% endraw %} -->

- GitHub only runs `issue_comment` workflows from the default branch, so bot commands start working once this file is merged.
- Adjust the `paths` to match your stack layout.
- The concurrency group allows one apply at a time per PR, and one at a time for `main`.

## Branch protection

To stop unapplied changes from merging, require the `terragrunt-apply` status check on the default branch.
Whenever it accepts an `apply-and-merge` command, the engine checks this setup and fixes it with the App's token if needed.
It adds the check to the default branch's protection rule (creating the rule if needed), enables auto-merge and squash merging, and disables merge commits and rebase merging.
If the App lacks permission to make those changes, the apply does not run; see [troubleshooting](using-the-bot.md#the-bot-said-applying-but-nothing-ran).
Repository rulesets and bypass permissions are not changed, so review them separately.

## Scheduled applies (optional)

A scheduled caller applies every stack from the default branch, which corrects drift by changing live resources:

```yaml
# .github/workflows/terragrunt-apply-all.yml
name: Apply all stacks

on:
  schedule:
    - cron: "0 10 * * *"
  workflow_dispatch: {}

permissions:
  contents: read
  id-token: write

concurrency:
  group: apply-all
  cancel-in-progress: false

jobs:
  apply:
    uses: chanzuckerberg/github-actions/.github/workflows/terragrunt-engine.yml@v6
    secrets: inherit
    with:
      action: apply
      all_stacks: true
```

The run fails for any stack a PR has claimed rather than overwriting that PR's applied changes; the other stacks still apply.
A manual run applies whichever branch it is started on, without the bot's review checks.
