# Archived Repository Scanner

A GitHub Action that scans your repository for references to GitHub repositories and identifies which ones have been archived. Archived repositories are read-only and no longer receive updates, which poses two key risks:

1. **No Security Updates**: Archived repos don't receive security patches
2. **Maintenance Issues**: No bug fixes or compatibility updates

When archived dependencies are found, please:

1. **Find Alternatives**: Look for actively maintained forks or alternative libraries
2. **Fork if Necessary**: Create your own fork if no alternatives exist. You will need to own security scanning and mitigation for the fork.

## Features

- Scans all files in your repository for GitHub.com links
- Checks if referenced repositories are archived using the GitHub API
- Reports findings as security vulnerabilities in GitHub Code Scanning
- Provides detailed SARIF reports for integration with security tools
- Comments on pull requests when archived dependencies are found
- Configurable file exclusion patterns

## Usage

Add this to your workflow file (e.g., `.github/workflows/archived-repo-scan.yml`):

```yaml
name: 'Archived Repository Scanner'

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sundays at 2 AM UTC
  workflow_dispatch:

jobs:
  archived-repo-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
      pull-requests: write
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate GitHub App token
        id: generate_token
        uses: actions/create-github-app-token@v2
        with:
          app-id: ${{ secrets.GH_ACTIONS_HELPER_APP_ID }}
          private-key: ${{ secrets.GH_ACTIONS_HELPER_PK }}
          owner: chanzuckerberg

      - name: Scan for archived repositories
        uses: chanzuckerberg/github-actions/.github/actions/archived-repo-scanner@main
        with:
          github_token: ${{ steps.generate_token.outputs.token }}
          fail_on_archived: 'false'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API access | No | `${{ github.token }}` |
| `fail_on_archived` | Whether to fail the workflow if archived repos are found | No | `true` |
| `exclude_patterns` | Comma-separated list of file patterns to exclude | No | `.git/**,node_modules/**,dist/**,build/**,*.log` |

## Outputs

| Output | Description |
|--------|-------------|
| `archived_repos_found` | Number of archived repositories found |
| `sarif_file_path` | Path to the generated SARIF file |
| `total_github_links` | Total number of GitHub links found |

## Supported URL Formats

The scanner recognizes these GitHub URL formats:

- `https://github.com/owner/repo`
- `git@github.com:owner/repo.git`
- `github.com/owner/repo` (without protocol)

## Permissions

The action requires these permissions:

- `security-events: write` - Upload SARIF results to Code Scanning
- `contents: read` - Access repository files
- `actions: read` - Access the action itself
- `pull-requests: write` - Comment on pull requests (optional)
- `id-token: write` - Generate GitHub App tokens (if using app authentication)


## Development

### Building the Action

```bash
cd .github/actions/archived-repo-scanner
npm install
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

MIT License - see LICENSE file for details.
