# CODEOWNERS Approval Check

Reports a **commit status** that is green only when **every changed file that
matches a CODEOWNERS rule** is either:

- authored by a code owner of that file, or
- approved (an `APPROVED` review) by a code owner of that file.

Team owners (`@org/team`) are expanded to their member logins, so an approval or
authorship from any team member satisfies the rule. This mirrors GitHub's
branch-protection "Require review from Code Owners" behavior.

The verdict is published as a **single commit status** (the `status-context`
input) keyed by `(sha, context)`, so the `pull_request` and
`pull_request_review` runs update the *same* row (latest wins) with a clean,
stable name. The **full breakdown of who still needs to review and for which
files** is written to the **Actions job summary**, reachable from the status'
Details link.

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
5. Posts the `status-context` commit status: `success` when every owned file is
   covered (or when nothing is owned), `failure` when not (a genuine error posts
   an `error` status and fails the job). The status description carries a compact
   "waiting on" line; the job summary carries the grouped "waiting on" list and a
   per-file table labeling each owned file `Author is an owner` / `Approved by
   @x` / `Needs approval`.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | no | `${{ github.token }}` | Reads PR files/reviews and writes the commit status (needs `pull-requests: read` + `statuses: write`). |
| `org-token` | yes | | GitHub App token with org `Members:read`, used only to expand `@org/team` owners. |
| `org` | no | `${{ github.repository_owner }}` | Organization whose teams are expanded. |
| `codeowners-path` | no | `.github/CODEOWNERS` | Path to the CODEOWNERS file. |
| `status-context` | no | `codeowners-approval` | The commit status context to publish; require this one in branch protection. |
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
  statuses: write

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

Then require the `codeowners-approval` **status context** in the branch
protection rule (not the `report` job). Because the gate is a commit status, a
merge queue must also post that context on the merge-group SHA — see the caller
workflow in the evolutionaryscale repo for the `merge_group` passthrough.

## Notes

- The job stays green even when coverage fails; the commit status carries the
  red/green verdict so the check collapses to a single latest-wins entry.
- The per-file breakdown lives in the Actions job summary (linked from the
  status' Details), so there are no PR comments or diff annotations.
- Bare email owners in CODEOWNERS cannot be mapped to a login and are ignored
  (a file owned solely by an email can never be satisfied; a warning is logged).
- Owner/login comparisons are case-insensitive.
