# Getting started

## Prerequisites

!!! todo
    Document what a repo needs before adopting the engine: the terragrunt-bot GitHub App installation, org secrets, AWS role trust, and stack layout.

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

!!! todo
    Explain the `terragrunt-apply` required status check and how the engine enforces it.
