# Archived Repository Scanner

A GitHub Action that scans your repository for references to GitHub repositories and identifies which ones have been archived. Archived repositories are read-only and no longer receive updates, which may pose security and maintenance risks.

## Features

- 🔍 Scans all files in your repository for GitHub.com links
- 🗄️ Checks if referenced repositories are archived using the GitHub API
- 🚨 Reports findings as security vulnerabilities in GitHub Code Scanning
- 📊 Provides detailed SARIF reports for integration with security tools
- 💬 Comments on pull requests when archived dependencies are found
- ⚙️ Configurable file patterns and severity levels

## Usage

### Basic Usage

Add this to your workflow file (e.g., `.github/workflows/security.yml`):

```yaml
name: Security Scan
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  archived-repo-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Scan for archived repositories
        uses: chanzuckerberg/github-actions/.github/actions/archived-repo-scanner@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Usage

```yaml
- name: Scan for archived repositories
  uses: chanzuckerberg/github-actions/.github/actions/archived-repo-scanner@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    include_patterns: '**/*.js,**/*.ts,**/*.json,**/*.md'
    exclude_patterns: '.git/**,node_modules/**,dist/**'
    severity: 'high'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `include_patterns` | Comma-separated list of file patterns to include | No | `**/*` |
| `exclude_patterns` | Comma-separated list of file patterns to exclude | No | `.git/**,node_modules/**,dist/**,build/**,*.log` |
| `severity` | Security alert severity level (`error`, `warning`, `note`) | No | `error` |

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

## SARIF Integration

The action generates SARIF (Static Analysis Results Interchange Format) reports that integrate with:

- GitHub Code Scanning (Security tab)
- Third-party security tools
- IDE extensions
- CI/CD pipelines

## Security Considerations

### Why Archived Repositories Matter

Archived repositories pose several risks:

1. **No Security Updates**: Archived repos don't receive security patches
2. **Maintenance Issues**: No bug fixes or compatibility updates
3. **Dependency Chain**: May affect your software supply chain security
4. **Compliance**: May not meet organizational security policies

### Recommended Actions

When archived dependencies are found:

1. **Find Alternatives**: Look for actively maintained forks or alternative libraries
2. **Fork if Necessary**: Create your own fork if no alternatives exist. You will need to own security scanning and mitigate findings for the fork.

## Permissions

The action requires these permissions:

- `security-events: write` - To upload SARIF results to Code Scanning
- `contents: read` - To access repository files
- `actions: read` - To access the action itself

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
