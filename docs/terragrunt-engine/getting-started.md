# Getting started

## Prerequisites

!!! todo
    Document what a repo needs before adopting the engine: the terragrunt-bot GitHub App installation, org secrets, AWS role trust, and stack layout.

## Caller workflows

A repo adopts the engine with thin caller workflows.
`chanzuckerberg/argus-infra-stacks` is the reference implementation.

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

### Apply from PR comments

```yaml
# TODO: confirm against the reference caller in argus-infra-stacks
on:
  issue_comment:
    types: [created]

jobs:
  apply:
    if: ${{ github.event.issue.pull_request && contains(github.event.comment.body, '@terragrunt-bot') }}
    uses: chanzuckerberg/github-actions/.github/workflows/terragrunt-engine.yml@terragrunt-engine-v0
    with:
      action: apply
    secrets: inherit
```

## Branch protection

!!! todo
    Explain the `terragrunt-apply` required status check and how the engine enforces it.
