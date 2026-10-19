---
---

# Stack authority

[Documentation home](../index.md) · [Terragrunt Engine overview](index.md)

Stack authority is the engine's record of which PR currently controls a stack.
A claim reserves a stack for a PR while it applies and until the claim is released.
The claim itself does not prove that an apply completed successfully.

## Why it exists

An apply changes live infrastructure before the PR merges.
Without coordination, another PR or a scheduled apply from `main` could overwrite those changes.
Stack ownership prevents applies from a different PR or from `main` while the claim is held.

## How a claim works

Before a comment-triggered apply, the engine checks existing ownership and claims each selected stack for the PR.
Claims are stored in the `authority_table` DynamoDB table under a `LockID` shaped like `authority/<owner>/<repo>/<stack>`.
The record includes the PR number, actor, and claim timestamp, along with the commit SHA of the workflow event.
For comment-triggered applies, that SHA is the latest commit on the default branch, not the PR commit being applied.

A conditional write permits a claim only when no claim exists, the owner is `main`, or the same PR already owns the stack.
That prevents two different PRs from both claiming the same stack during a race.
No claim record means the stack is controlled by `main`.

## Stack ownership versus state locking

Terraform's state lock protects a particular state file while an operation is running.
Stack ownership coordinates the engine's applies across PRs and can remain after a run finishes.
The records may share a DynamoDB table, but they use different keys and serve different purposes.
The Terraform state-lock cleanup step does not release PR ownership claims.

## When authority is released

- After all selected stacks apply successfully, the `finalize` job releases their claims.
- `@terragrunt-bot unlock` deletes the claims on the PR's selected stacks, whichever PR holds them, as well as their state locks.
- Closing or merging a PR releases any remaining claims belonging to that PR through `release-on-close`.
- A separate reaper workflow can remove claims for closed PRs or claims older than its configured maximum age, which defaults to 30 days.

`finalize` releases claims after successful applies even if merging is still waiting or the merge attempt fails.
After an unsuccessful apply, claims remain unless one of the other release paths runs.
Releasing a claim does not undo infrastructure changes; it allows other engine runs to apply to the stack again.

The reference [reaper caller](https://github.com/chanzuckerberg/shared-infra/blob/8a2fd6c7a2a2ac3125a4dd33bd82b03b7f832227/.github/workflows/terragrunt_reap_authority.yml) runs on the 1st and 16th of each month at 12:00 UTC and can also be started manually.

## Plans versus applies

With the default `skip_pr_owned: true`, a plan warns when a stack belongs to a PR but continues.
An apply from another PR or from `main` fails the ownership check for that stack.
An apply from the PR that owns it may proceed.
This check applies to scheduled runs too, so an all-stacks run does not override PR ownership.

> **TODO: Team procedures**
>
> Confirm how engineers should coordinate competing PRs and how to recover abandoned claims after a failed or partially completed apply.

## Implementation references

- [Claim keys, conditional writes, and releases](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/actions/terragrunt-stack-authority/src/lib.ts#L41-L153).
- [Ownership checks and reaping](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/actions/terragrunt-stack-authority/src/index.ts#L49-L219).
- [Workflow claim and release conditions](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/workflows/terragrunt-engine.yml#L372-L390), [finalize](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/workflows/terragrunt-engine.yml#L565-L613), and [release on close](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/workflows/terragrunt-engine.yml#L615-L640).
