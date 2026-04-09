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
`preserve_files` input lets you specify files whose automation-made changes should
be carried forward onto the new release branch.

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

With glob patterns (note: `*` matches a single path segment, not recursive):

```yaml
            preserve_files: '*/.infra/staging/values.yaml'
```

`preserve_files` accepts file paths or glob patterns (`*`, `?`, `[]`), separated
by commas, newlines, or a mix of both. Patterns are expanded against the old
branch's file tree.

After release-please runs, the action computes the diff between the old branch's
base commit and the old branch tip (i.e., exactly what the automation changed),
then applies that patch to the new release branch with `git apply`. Only the
automation's specific edits are replayed -- other changes in the same file (e.g.,
new env vars merged from main) are never touched. If the patch does not apply
cleanly, the branch is left as-is and a warning is logged. If a pattern matches
no files on the old branch (e.g., the automation hasn't run yet on this release
cycle), it is silently skipped.
