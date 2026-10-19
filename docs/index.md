---
---

# chanzuckerberg/github-actions

Reusable GitHub Actions workflows and actions used across CZI.
The source is in [chanzuckerberg/github-actions](https://github.com/chanzuckerberg/github-actions).

## Using a workflow or action

Call a reusable workflow as a job, and an action as a step:

```yaml
jobs:
  call-a-workflow:
    uses: chanzuckerberg/github-actions/.github/workflows/<workflow>.yml@<tag>
    secrets: inherit

  use-an-action:
    runs-on: ubuntu-latest
    steps:
      - uses: chanzuckerberg/github-actions/.github/actions/<action>@<tag>
```

See GitHub's guides to [reusing workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows) and [finding and customizing actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/find-and-customize-actions) for details.

## Versions

Releases are created by [Release Please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) messages.
Many actions have their own release tags named after the action, such as `terragrunt-git-status-v0`; everything else is released under repository-wide tags, such as `v6`.
Floating tags such as `v6` and `v6.42` move to the newest matching release.

## Actions with their own documentation

- [archived-repo-scanner](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/archived-repo-scanner)
- [codeowners-approval-check](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/codeowners-approval-check)
- [conventional-commits](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/conventional-commits)
- [docker-build-push](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/docker-build-push)
- [happy-cleanup](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/happy-cleanup)
- [release-please-semvar](https://github.com/chanzuckerberg/github-actions/tree/main/.github/actions/release-please-semvar)
