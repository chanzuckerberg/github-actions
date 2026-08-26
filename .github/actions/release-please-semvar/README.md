# Release please with extras

A JS action wrapping the [release-please](https://github.com/googleapis/release-please)
library. It creates/updates release PRs and GitHub releases, tags floating
major/minor versions (e.g. `v1`, `v1.1` in addition to `v1.1.1`), and
optionally carries forward automation-made file changes across release-please's
force pushes — all in a single commit per release branch.

## Usage

```yaml
name: release-please
on:
  push:
    branches: [main]
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - name: Generate token
        uses: actions/create-github-app-token@v3
        id: generate_token
        with:
          client-id: ${{ secrets.GH_ACTIONS_HELPER_APP_ID }}
          private-key: ${{ secrets.GH_ACTIONS_HELPER_PK }}
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@v6
        with:
          app_token: ${{ steps.generate_token.outputs.token }}
```

For automatic component-level major and minor version tagging, pass:

```yaml
          include_component_in_tag: true
```

or set `include-component-in-tag: true` in `release-please-config.json`.

## Preserving files across release-please force pushes

`release-please` force-pushes its release branch every time it runs, which
overwrites any commits added by other automations (e.g., Docker image tag
updates written by the CI build). The `preserve_files` input lets you specify
files whose changes should be carried forward into the new release commit.

```yaml
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@release-please-semvar-v0
        with:
          app_token: ${{ steps.generate_token.outputs.token }}
          preserve_files: |
            projects/*/.infra/staging/values.yaml
            projects/*/.infra/prod/values.yaml
```

`preserve_files` accepts file paths or glob patterns (`*`, `?`), separated by
commas, newlines, or a mix of both. Patterns are expanded against the old
release branch's file tree.

### How it works

The action registers a custom release-please
[ManifestPlugin](https://github.com/googleapis/release-please/blob/main/src/plugin.ts)
that runs during `buildPullRequests()`. For each release branch that already
exists, the plugin:

1. Reads the old branch tip and computes the diff vs the branch's merge-base
   (i.e., exactly what the automation changed since branching from main).
2. For each matched file, injects an `Updater` into the candidate PR's updates
   that applies the carried-forward values onto the new (main-based) content.
3. release-please then commits its own updates **plus** the plugin's updates as
   a single commit and force-pushes once.

Only single-line scalar-value replacements are carried forward (the typical
`tag: sha-*` image tag case). Multi-line hunks, insertions, and deletions are
skipped. When main also changed the same line, the carried-forward value wins
via YAML key-prefix matching.

Because everything happens inside release-please's single `createPullRequests()`
call, there is exactly **one push per release branch** — no GITHUB_TOKEN tricks,
no amend-and-re-push, no double-triggering of downstream workflows or webhook
consumers.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `app_token` | yes | | GitHub App token with `contents: write` and `pull-requests: write` |
| `include_component_in_tag` | no | `false` | Add component prefix to tags/branches for monorepo releases |
| `preserve_files` | no | `''` | Comma/newline-separated file paths or globs to carry forward |
