# Release please with extras

Release please except it also tags major/minor versions. e.g. instead of only tagging
v1.1.1, it also tags v1, v1.1

Usage

```
name: release-please
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - name: Generate token
        uses: actions/create-github-app-token@v1
        id: generate_token
        with:
          app-id: ${{ secrets.GH_ACTIONS_HELPER_APP_ID }}
          private-key: ${{ secrets.GH_ACTIONS_HELPER_PK }}
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@main
        with:
            app_token: ${{ steps.generate_token.outputs.token }}
```

For automatic component-level major and minor version tagging, you can pass in

```
          include_component_in_tag: true
```

or set the corresponding setting in the release please config file.

## Preserving files across release-please force pushes

`release-please` force-pushes its release branch every time it runs, which overwrites
any commits added by other automations (e.g., Docker image tag updates). The
`preserve_files` input lets you specify files that should be restored from the
pre-force-push state of the branch.

Comma-separated:

```yaml
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@main
        with:
            app_token: ${{ steps.generate_token.outputs.token }}
            preserve_files: '.infra/prod/values.yaml,.infra/staging/values.yaml'
```

Newline-separated (YAML multiline):

```yaml
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@main
        with:
            app_token: ${{ steps.generate_token.outputs.token }}
            preserve_files: |
              .infra/prod/values.yaml
              .infra/staging/values.yaml
```

With glob patterns:

```yaml
            preserve_files: '.infra/*/values.yaml'
```

`preserve_files` accepts file paths or glob patterns (`*`, `?`, `[]`), separated
by commas, newlines, or a mix of both. Patterns are expanded against the old
branch's file tree. After release-please runs, matched files are carried forward
via 3-way merge so only branch-specific edits are preserved. If a pattern matches
no files on the old branch (e.g., the automation hasn't run yet), it is silently
skipped.