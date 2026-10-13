# chanzuckerberg/github-actions

This open-source repository contains reusable GitHub Actions and workflows used across CZI.

Releases are automated using [Release Please](https://github.com/googleapis/release-please).
It reads commit messages following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
format, such as `fix:` and `feat:`, and opens a release PR with proposed version
updates and changelog entries. When that PR is merged, it creates the corresponding
version tags and GitHub Releases.

## Using a reusable workflow

```yaml
jobs:
  example:
    uses: chanzuckerberg/github-actions/.github/workflows/<workflow>.yml@<tag>
    secrets: inherit
```

## Using a composite or JavaScript action

```yaml
steps:
  - uses: chanzuckerberg/github-actions/.github/actions/<action>@<tag>
```

## Catalog

| Name | Kind | Docs |
| --- | --- | --- |
| Terragrunt Engine | Reusable workflow | [Overview](terragrunt-engine/index.md) |

!!! todo
    Add the remaining workflows and actions. Several actions already have a
    README under `.github/actions/<name>/README.md` that can be linked or moved here.
