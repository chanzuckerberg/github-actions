# Conventional Commits

Validates that a pull request title follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

By default, scope is optional and any lowercase kebab-case string (or a Jira ticket ID) is accepted as a valid scope. Two inputs let you tighten this for repos that need a fixed scope allowlist.

## Usage

### Basic — scope optional, any value accepted

```yaml
jobs:
  validate-pr-title:
    runs-on: [ARM64]
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: chanzuckerberg/github-actions/.github/actions/conventional-commits@main
```

### Strict — scope required, limited to an allowlist

```yaml
jobs:
  validate-pr-title:
    runs-on: [ARM64]
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: chanzuckerberg/github-actions/.github/actions/conventional-commits@main
        with:
          require-scope: "true"
          allowed-scopes: "api,frontend,infra"
```

A PR title of `feat(api): add pagination` passes; `feat: add pagination` or `feat(banana): add pagination` fails.

### Extra wildcard/custom scope patterns

`extra-scopes` appends additional regex-style patterns on top of the default catch-all (or the `allowed-scopes` list). Supports `*` as a wildcard:

```yaml
      - uses: chanzuckerberg/github-actions/.github/actions/conventional-commits@main
        with:
          extra-scopes: "INFRA-*,my-team"
```

`extra-scopes` is additive — it never replaces the catch-all or the `allowed-scopes` list.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `extra-scopes` | no | `""` | Comma-separated list of additional scope patterns to allow. Supports `*` as a wildcard (e.g. `INFRA-*` matches `INFRA-123`). |
| `require-scope` | no | `"false"` | When `"true"`, a scope is mandatory in the PR title. |
| `allowed-scopes` | no | `""` | Comma-separated list of exact allowed scopes. When set, the default catch-all pattern is disabled and only these scopes (plus Jira patterns and `extra-scopes`) are valid. |

## Behavior details

**Scope alternatives always include Jira ticket patterns** (`CCIE-123`, `CDI-456`, `ONCALL-789`, etc.) regardless of any input.

**`allowed-scopes` vs `extra-scopes`**

- `allowed-scopes` _replaces_ the default catch-all — use it when you want a strict fixed list.
- `extra-scopes` _extends_ whatever alternatives are already present — use it when you want a wildcard or a few additional patterns on top.

**Valid commit types:** `build`, `chore`, `ci`, `deps`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

**Breaking changes:** append `!` before the colon, e.g. `feat(api)!: remove deprecated endpoint`.
