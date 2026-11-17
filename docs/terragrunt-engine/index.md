---
---

# Terragrunt Engine

[Documentation home](../index.md)

Terragrunt Engine ([`terragrunt-engine.yml`](https://github.com/chanzuckerberg/github-actions/blob/v6.42.0/.github/workflows/terragrunt-engine.yml)) is a reusable workflow that plans and applies Terraform through Terragrunt from pull requests.
A repository adds two small caller workflows.
The engine then plans the changed stacks on every PR, applies them when someone comments `@terragrunt-bot apply-and-merge`, and merges the PR once every apply succeeds.

## How a change flows

| When | What happens |
| --- | --- |
| A PR is opened or updated | The engine plans each changed stack and sets the PR's `terragrunt-apply` status to pending. A PR that changes no stacks passes that status straight away. |
| Someone comments `@terragrunt-bot apply-and-merge` | After [some checks](using-the-bot.md#before-applying), the engine applies each changed stack. Once all of them succeed, it squash-merges the PR using GitHub auto-merge. |
| The PR merges | If the apply caller also runs on pushes to `main`, the changed stacks are applied again from `main`. This normally changes nothing. |
| The PR closes | The engine releases the PR's claims on its stacks. |
| On a schedule (optional) | A repository can add a caller that applies every stack, which corrects drift. |

## Stacks

A stack is a directory such as `terraform/envs/prod`.
The engine runs `terragrunt run --all` from the stack directory, so every component in the stack is planned or applied together.
Changing one component therefore plans and applies the whole stack, including any drift in its other components, so read the full plan.
See [how stacks are selected](inputs.md#how-stacks-are-selected).

## Applying before merging

When the `terragrunt-apply` check is [required](getting-started.md#branch-protection), `main` only receives changes that have already applied successfully.
A few consequences are worth knowing:

- The apply runs Terraform again; it does not apply the plan shown on the PR.
- While a PR applies, it claims its stacks, and applies from other PRs or from `main` to those stacks fail until the claim is released.
- Claims are released once every stack applies, when the PR closes, or by [`@terragrunt-bot unlock`](using-the-bot.md#unlock).
- A successful apply and a merge are separate outcomes.
  If another required check is still pending or the merge fails, the infrastructure has already changed.

## Version

These pages describe release [v6.42.0](https://github.com/chanzuckerberg/github-actions/tree/v6.42.0).
Callers usually pin the floating `v6` tag.
The engine calls its helper actions through floating tags such as `terragrunt-git-status-v0`, so its behavior can change without the `v6` tag moving.

## Getting help

To onboard a repository or report a problem, contact the core infra team.

## Pages

- [Getting started](getting-started.md): prerequisites and the caller workflows.
- [Using the bot](using-the-bot.md): commands, the checks before applying, and troubleshooting.
- [Inputs](inputs.md): workflow inputs, secrets, and how stacks are selected.
