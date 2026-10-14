# chanzuckerberg/github-actions

This open-source repository contains reusable GitHub Actions and workflows used across CZI.

Releases are automated using [Release Please](https://github.com/googleapis/release-please).
It reads commit messages following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
format, such as `fix:` and `feat:`, and opens a release PR with proposed version
updates and changelog entries. When that PR is merged, it creates the corresponding
version tags and GitHub Releases.

## Using a reusable workflow

You can invoke a reusable workflow from another repository by creating a workflow
file under that repository's `.github/workflows/` directory. The file defines when
to run and calls the shared workflow as a job.

The following snippet shows only the `jobs` section of that caller file. Replace
`<workflow>` with the workflow's name and `<tag>` with the version you want to use.
Pass any required inputs through `with`. The `secrets: inherit` setting passes
the secrets available to the calling workflow to the shared workflow.

```yaml
jobs:
  example:
    uses: chanzuckerberg/github-actions/.github/workflows/<workflow>.yml@<tag>
    secrets: inherit
```

See [Getting started with Terragrunt Engine](terragrunt-engine/getting-started.md)
for a complete caller example and integration details.

## Using a composite or JavaScript action

You can use an individual action inside a job in your repository's workflow file.
Unlike a reusable workflow, an action is called from a job's `steps` list. The
following snippet shows only that list, not a complete workflow file:

```yaml
steps:
  - uses: chanzuckerberg/github-actions/.github/actions/<action>@<tag>
```

Replace `<action>` with the action's directory name and `<tag>` with its version
tag. Add any required inputs using `with`, as described in that action's documentation.

## Catalog

| Name | Kind | Docs |
| --- | --- | --- |
| Terragrunt Engine | Reusable workflow | [Overview](terragrunt-engine/index.md) |

!!! todo
    Add the remaining workflows and actions. Several actions already have a
    README under `.github/actions/<name>/README.md` that can be linked or moved here.
