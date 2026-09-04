# CODEOWNERS Approval Check

Reports a **Check Run** that is green only when **every changed file that
matches a CODEOWNERS rule** is either:

- authored by a code owner of that file, or
- approved (an `APPROVED` review) by a code owner of that file.

Team owners (`@org/team`) are expanded to their member logins, so an approval or
authorship from any team member satisfies the rule. This mirrors GitHub's
branch-protection "Require review from Code Owners" behavior, but adds a
Details panel that shows exactly who still needs to review and for which files.

The action upserts a **single Check Run** per head SHA (looking up an existing
check of the same name on the SHA and updating it in place). Because both the
`pull_request` and `pull_request_review` runs report as the same GitHub Actions
app, the check flips in place across events rather than leaving a stale failure
next to a newer pass. The Check Run's **conclusion is the gate**, so **require
the `check-name` (default `codeowners-approval`) in branch protection**.

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
5. Upserts the `check-name` Check Run: conclusion `success` when every owned
   file is covered (or when nothing is owned), `failure` when not (a genuine
   error also fails the job). The output carries a **"waiting on"** summary
   grouped by the owners that can still unblock the PR, a per-file breakdown
   labeling each owned file `Author is an owner` / `Approved by @x` /
   `Needs approval`, and an inline **annotation** on each file still needing
   approval.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | no | `${{ github.token }}` | Reads PR files/reviews and creates/updates the Check Run (needs `pull-requests: read` + `checks: write`). |
| `org-token` | yes | | GitHub App token with org `Members:read`, used only to expand `@org/team` owners. |
| `org` | no | `${{ github.repository_owner }}` | Organization whose teams are expanded. |
| `codeowners-path` | no | `.github/CODEOWNERS` | Path to the CODEOWNERS file. |
| `check-name` | no | `codeowners-approval` | The Check Run name to publish; require this one in branch protection. |
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
  checks: write

jobs:
  report:
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

Then require the `codeowners-approval` **check** in the branch protection rule.
For a merge queue, also create a passing `codeowners-approval` check on the
merge-group SHA (there is no PR to evaluate in the queue) — see the caller
workflow in the evolutionaryscale repo for the `merge_group` passthrough.

## Notes

- A single check run is updated in place across events, so there is never a
  stale failure sitting next to a newer pass.
- Bare email owners in CODEOWNERS cannot be mapped to a login and are ignored
  (a file owned solely by an email can never be satisfied; a warning is logged).
- Owner/login comparisons are case-insensitive.
