# Stack authority

Stack authority records which branch the live infrastructure for a stack
reflects: `main`, or a specific pull request that has applied but not yet merged.

## Why it exists

!!! todo
    Explain the problem: two unmerged PRs applying to the same stack and
    overwriting each other.

## How a claim works

!!! todo
    Describe the DynamoDB record and the conditional write. Source:
    `.github/actions/terragrunt-stack-authority/src/lib.ts`.

## When authority is released

- [ ] After a successful `apply-and-merge` (the `finalize` job)
- [ ] On `@terragrunt-bot unlock`
- [ ] When the pull request is closed (the `release-on-close` job)

## Plans versus applies

!!! todo
    Explain that plans on an owned stack are annotated but proceed, while applies fail.
