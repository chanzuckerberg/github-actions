on: push

jobs:
  fogg-apply:
    runs-on: ubuntu-latest
    env:
        FOGG_GITHUBTOKEN: ${{ secrets.CZIBUILDBOT_GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v2
      - name: Cache Fogg
        id: cache-fogg
        uses: actions/cache@v3
        with:
          path: |
            ~/.fogg/cache
          key: fogg-cache
      - run: make setup
      - run: |
          echo "Cache hit: ${{steps.cache-fogg.outputs.cache-hit}}"
          ls -l ~/.fogg/cache/
          .fogg/bin/fogg apply
          if [ "$(git status --porcelain)" != "" ]; then
            echo "git tree is dirty after running fogg apply"
            echo "ensure you run fogg apply on your branch"
            git status
            exit 1
          fi
          ls -l ~/.fogg/cache/
  find-changed-dirs:
    runs-on: ubuntu-latest
    outputs:
      changedModules: ${{ steps.changedDirs.outputs.changedModules }}
      changedEnvsAccounts: ${{ steps.changedDirs.outputs.changedEnvsAccounts }}
    steps:
      - uses: actions/checkout@v2
      - uses: dorny/paths-filter@v2.10.2
        id: filter
        with:
          list-files: json
          filters: |
            changed: ['terraform/**']
      - uses: actions/github-script@v6
        id: changedDirs
        with:
          script: |
            const path = require("path")
            const changedFiles = ${{ steps.filter.outputs.changed_files }}
            const changedDirs = changedFiles.map(f => path.dirname(f))
            console.log(`Found the following changed dirs: ${JSON.stringify(changedDirs, null, 2)}\n OG: ${JSON.stringify(changedFiles, null, 2)} `)
            const changedModules = changedDirs.filter(d => d.indexOf("modules") !== -1)
            const changedEnvsAccounts = changedDirs.filter(d => d.indexOf("modules") === -1)
            console.log(`changedModules: ${JSON.stringify(changedModules)}`)
            console.log(`changedEnvsAccounts: ${JSON.stringify(changedEnvsAccounts)}`)
            core.setOutput("changedModules", changedModules)
            core.setOutput("changedEnvsAccounts", changedEnvsAccounts)
  lint-changed-modules:
    runs-on: ubuntu-latest
    needs: find-changed-dirs
    strategy:
      matrix:
        tfmodule: ${{ fromJson(needs.find-changed-dirs.outputs.changedModules) }}
    steps:
      - uses: actions/checkout@v2
      - run: |
          make setup
          cd ${{matrix.tfmodule}}
          ../../../.fogg/bin/tflint
          make lint
  lint-changed-envs-acounts:
    runs-on: ubuntu-latest
    needs: find-changed-dirs
    strategy:
      matrix:
        tfmodule: ${{ fromJson(needs.find-changed-dirs.outputs.changedEnvsAccounts) }}
    steps:
      - uses: actions/checkout@v2
      # TODO: this requires a TFE token to do the validate
      # make run CMD="validate"
      - run: |
          make setup
          cd ${{matrix.tfmodule}}
          make init
          ../../../../.fogg/bin/tflint
          make run CMD="fmt --diff --check"
