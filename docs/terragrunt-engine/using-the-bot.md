---
---

# Using the bot

[Documentation home](../index.md) · [Terragrunt Engine](index.md)

Comment on a pull request in a repository with the [apply caller](getting-started.md#apply-from-pr-comments-and-pushes-to-main).
On PRs that change stacks, the bot also posts a help comment listing these commands.

## Commands

### apply-and-merge

```text
@terragrunt-bot apply-and-merge [--times=N] [--refresh=true|false]
```

Applies every changed stack and, once all of them succeed, merges the PR.

- `--times=N` allows up to `N` attempts per stack, from 1 through 5.
  A retry reruns the apply; it does not roll back a partial one.
- `--refresh=true` or `--refresh=false` overrides Terraform's refresh.
  Without it, comment-triggered applies use `-refresh=false`.

### unlock

```text
@terragrunt-bot unlock
```

Force-removes the DynamoDB state locks for the PR's changed stacks, and deletes the stacks' claims no matter which PR holds them.
It requires write access but skips the review checks, and does not apply or merge anything.
Before using it, make sure no run is still using the state, and check with the owner of any other PR that has claimed one of those stacks.

### help

```text
@terragrunt-bot help
```

Posts the help comment, or updates it if it already exists.
A comment with no command or an unknown command gets a reply listing the commands.

## Before applying

The bot accepts `apply-and-merge` only if:

- The commenter has write or admin access.
- The PR has the approvals branch protection requires.
  If branch protection doesn't require reviews, approvals are checked against `.github/CODEOWNERS` on the base branch instead; with no CODEOWNERS file or no matching rule, no approval is needed.
- The PR is not a draft, has no conflicts, and is up to date with its base branch.

It does not wait for the PR's other status checks.
Once accepted, the engine checks out the validated commit, merges in the latest base branch (stopping if that conflicts), claims each stack, and applies it.

## Troubleshooting

Start with the workflow run linked from the bot's comment.

### A stack is owned by another PR

The run reports `owned by PR #<number>` or `blocked — owned by PR #<number>`.
Another PR has claimed the stack, so look at that PR before applying.
Its claim is released when all its stacks apply successfully, when it closes, or by `unlock`.
Releasing a claim does not undo the other PR's changes.

### Terraform cannot acquire the state lock

A previous run may have stopped without releasing its lock, or another run may still hold it.
Check the lock details and any running workflows first.
If the lock is stale, use [`unlock`](#unlock).

### The bot says the branch is behind or conflicts

Update the branch from its base, for example with GitHub's **Update branch** button, and resolve any conflicts.
Wait for the new plan, review it, and comment again.

### The bot asks for an approval or a code-owner approval

Get the approval, or resolve the review that requested changes, and comment again.
For code-owner messages, compare the listed files with `.github/CODEOWNERS` on the base branch.

### The apply stopped because merging the base branch conflicts

The base branch changed after the bot accepted the command.
Merge the base branch into the PR, resolve the conflicts, push, and comment again after reviewing the new plan.

### The bot said "Applying" but nothing ran

The `dispatch` job failed at its `Enforce branch protection` step, which means GitHub refused one of the [settings changes](getting-started.md#branch-protection).
A common cause is the App lacking repository administration permission.
No Terraform ran; fix the error shown in the step's log, then comment again.

### The `terragrunt-apply` status stays pending

A plan alone never satisfies the status, and every new commit resets it to pending.
Run `apply-and-merge` on the current commit, or investigate the run that failed or stopped.

### The apply succeeded but the PR did not merge

The bot comments `Auto-merge enabled.` when GitHub is waiting on other required checks, or a message beginning `Not merged.` when GitHub refused the merge.
The infrastructure has already changed and the claims are released, so resolve the merge promptly.
