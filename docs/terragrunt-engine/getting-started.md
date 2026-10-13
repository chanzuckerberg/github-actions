# Getting started

## Prerequisites

!!! todo
    Document what a repo needs before adopting the engine: the terragrunt-bot
    GitHub App installation, org secrets, AWS role trust, and stack layout.

## Caller workflows

A repo adopts the engine with thin caller workflows. `chanzuckerberg/argus-infra-stacks`
is the reference implementation.

### Plan on pull requests

```yaml
# TODO: confirm against the reference caller in argus-infra-stacks
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  plan:
    uses: chanzuckerberg/github-actions/.github/workflows/terragrunt-engine.yml@terragrunt-engine-v0
    with:
      action: plan -lock=false
      set_apply_gate: true
    secrets: inherit
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
