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
      - uses: chanzuckerberg/github-actions/.github/actions/release-please-semvar@rzheng/CCIE-3947

```