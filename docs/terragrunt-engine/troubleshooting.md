# Troubleshooting

Start with the linked Actions run and the bot's PR comments.
The cases below describe behavior implemented in the engine; team-specific recovery and escalation procedures still need confirmation.

!!! todo "Team procedures"
    Confirm the support contact, production incident process, and who should authorize recovery actions such as force-unlocking state.

## A stack is owned by another PR

**Symptom:** the job reports `owned by PR #<number> — cannot proceed` or `One or more stacks are owned by another PR and cannot be applied`.

**Cause:** another PR holds the engine's ownership claim for a selected stack.
The same check applies to scheduled applies from `main`.

**Next step:** inspect the owning PR and its last apply before starting another apply against that stack.
Claims are released after successful finalization, when the PR closes, or by the explicit unlock and reaper paths.
See [Stack authority](stack-authority.md) for the distinction between a claim and a Terraform state lock.
Releasing ownership does not roll back infrastructure that the owning PR already changed.

## A Terraform state lock was left behind

**Symptom:** Terraform reports that it cannot acquire the state lock, and the lock information points to an earlier run.

**Cause:** a previous operation may have stopped before releasing its lock, or another operation may still be using it.

**Next step:** check the lock information and active workflow runs first.
Normal cleanup tries to release locks belonging to its own run.
If a lock is left behind, the engine provides `@terragrunt-bot unlock` for the stacks changed by the PR.
This force-removes DynamoDB locks and stack ownership claims, so use the [unlock guidance](bot-commands.md#terragrunt-bot-unlock) only after confirming no operation still holds the state.
The cleanup action does not support native S3 lockfiles or other backend types.

## Apply refused: branch is behind the base branch

**Symptom:** the bot says `Cannot apply — this branch is ... behind` its base branch.

**Cause:** applying an outdated branch could overwrite infrastructure changes already represented by the base branch.

**Next step:** merge the base branch, usually `main`, into the PR branch or use GitHub's Update branch button, then push any local merge.
Wait for the new plan, review it, and comment `@terragrunt-bot apply-and-merge` again.

## Apply refused: missing approval or code-owner approval

**Symptom:** the bot says the command needs an approval, is blocked while a review requests changes, or needs a code-owner approval for listed files.

**Cause:** the PR does not meet the review checks used by the engine.

**Next step:** obtain the required approval or resolve the requested changes before retrying the command.
For a code-owner message, inspect `.github/CODEOWNERS` on the base branch and the files named in the comment.
If an ownership rule appears incorrect, raise it with the team rather than bypassing the check.

## Merging the base branch conflicts during apply

**Symptom:** the job reports that merging the base branch conflicts and that the apply stopped before Terragrunt ran.

**Cause:** the engine merges the latest base branch into the job's working tree after validating the PR, and that merge found conflicts.

**Next step:** merge the base branch into the PR branch, resolve the conflicts, and push.
Review the new plan before commenting `@terragrunt-bot apply-and-merge` again.

## The `terragrunt-apply` status stays pending

**Symptom:** the PR still shows a pending `terragrunt-apply` status.

**Cause:** stack discovery sets that status to pending when stacks change; a plan by itself does not satisfy the apply gate.
A new commit also needs a new apply result, and an interrupted workflow may not reach finalization.

**Next step:** inspect the latest plan and apply runs for the current PR commit.
Once the PR is ready and the plan has been reviewed, run `@terragrunt-bot apply-and-merge`.
If an apply failed or stopped, investigate that failure before retrying.

## The apply succeeded but the PR did not merge

**Symptom:** the bot reports a successful apply followed by `Auto-merge enabled` or `Applied — not merged`.

**Cause:** GitHub may be waiting for another required check, or it may have rejected the merge request.

**Next step:** inspect the bot's merge message, the remaining required checks, and the branch's current state.
A successful apply and a completed merge are separate outcomes.
The finalizer releases stack ownership after all applies succeed even when the merge is waiting or failed, so check for later applies before deciding how to proceed.

## Implementation references

- [Ownership failure messages](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-stack-authority/src/index.ts#L49-L98).
- [Apply validation and review messages](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L604-L841).
- [Working-tree merge failure](https://github.com/chanzuckerberg/github-actions/blob/main/.github/workflows/terragrunt-engine.yml#L291-L308).
- [Gate status](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L224-L260) and [finalize results](https://github.com/chanzuckerberg/github-actions/blob/main/.github/actions/terragrunt-git-status/src/lib.ts#L299-L440).
