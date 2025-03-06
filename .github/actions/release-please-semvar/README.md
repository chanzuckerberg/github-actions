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