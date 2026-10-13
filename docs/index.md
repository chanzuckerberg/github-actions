# chanzuckerberg/github-actions

Reusable GitHub Actions and workflows used across CZI.

Each action and workflow is released independently with its own semver tag
(for example `terragrunt-engine-v0`), driven by conventional commits and
release-please.

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
