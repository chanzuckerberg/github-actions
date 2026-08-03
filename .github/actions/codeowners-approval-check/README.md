# CODEOWNERS Approval Check

A pull-request status check that passes only when **every changed file that
matches a CODEOWNERS rule** is either:

- authored by a code owner of that file, or
- approved (an `APPROVED` review) by a code owner of that file.

Team owners (`@org/team`) are expanded to their member logins, so an approval or
authorship from any team member satisfies the rule. This mirrors GitHub's
branch-protection "Require review from Code Owners" behavior, with an
informative log that explains exactly which files still need which owners.

## How it works

1. Reads CODEOWNERS from the PR's **base** ref (never the head — see Security).
2. Lists the PR's changed files and maps each to its owning rule using
   last-match-wins, gitignore-style matching (`codeowners-utils`). Files that
   match no rule impose no requirement.
3. Expands each rule's owners into member logins (`@user` → itself, `@org/team`
   → team members via the org token).
4. If the author owns every owned file, the check passes without fetching
   reviews (fast path). Otherwise it fetches reviews, takes each reviewer's
   latest non-`COMMENTED` stance, and treats `APPROVED` reviewers as approvers.
5. Passes iff every owned file is covered by the author or an approving owner.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | no | `${{ github.token }}` | Reads PR files and reviews (needs `pull-requests: read`). |
| `org-token` | yes | | GitHub App token with org `Members:read`, used only to expand `@org/team` owners. |
| `org` | no | `${{ github.repository_owner }}` | Organization whose teams are expanded. |
| `codeowners-path` | no | `.github/CODEOWNERS` | Path to the CODEOWNERS file. |
| `dismiss_stale_approvals` | no | `false` | When `true`, only count approvals submitted on the current head SHA. |

## Security

CODEOWNERS is always read from the PR **base** ref. Reading the head ref would
let a PR author add themselves as an owner in their own branch and self-approve,
bypassing the check. This matches how GitHub evaluates CODEOWNERS.

## Example

```yaml
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]
  pull_request_review:
    types: [submitted, dismissed, edited]

permissions:
  contents: read
  pull-requests: read

jobs:
  codeowners-approval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/create-github-app-token@v3
        id: app-token
        with:
          client-id: ${{ secrets.TEAM_SYNC_APP_CLIENT_ID }}
          private-key: ${{ secrets.TEAM_SYNC_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
      - uses: chanzuckerberg/github-actions/.github/actions/codeowners-approval-check@main
        with:
          github-token: ${{ github.token }}
          org-token: ${{ steps.app-token.outputs.token }}
          dismiss_stale_approvals: false
```

## Notes

- Bare email owners in CODEOWNERS cannot be mapped to a login and are ignored
  (a file owned solely by an email can never be satisfied; a warning is logged).
- Owner/login comparisons are case-insensitive.
