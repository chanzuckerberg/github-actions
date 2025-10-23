import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { getOctokit } from '@actions/github';
import * as core from '@actions/core';
import {
  GitHubRepo, RepoReference, FileLocation, SarifReport, SarifResult, SarifRule,
} from './types';

// Regex to match various GitHub URL formats
const GITHUB_URL_PATTERNS = [
  // https://github.com/owner/repo
  /https:\/\/github\.com\/([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])\/([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])/g,
  // git@github.com:owner/repo.git
  /git@github\.com:([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])\/([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])\.git/g,
  // github.com/owner/repo (without protocol)
  /github\.com\/([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])\/([a-zA-Z0-9][\w.-]*[a-zA-Z0-9])/g,
];

export class ArchiveScanner {
  private octokit: ReturnType<typeof getOctokit>;

  private checkedRepos = new Map<string, boolean>();

  constructor(githubToken: string) {
    this.octokit = getOctokit(githubToken);
  }

  async scanRepository(excludePatterns: string[]): Promise<RepoReference[]> {
    const files = await ArchiveScanner.getFilesToScan(excludePatterns);
    core.info(`Scanning ${files.length} files for GitHub repository references`);

    const repoMap = new Map<string, RepoReference>();

    // Extract repository references from all files
    await Promise.all(files.map(async (file) => {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const repos = ArchiveScanner.extractGitHubRepos(content, file);

        repos.forEach(({ repo, location }) => {
          const key = `${repo.owner}/${repo.name}`;
          if (repoMap.has(key)) {
            repoMap.get(key)!.locations.push(location);
          } else {
            repoMap.set(key, { repo, locations: [location] });
          }
        });
      } catch (error) {
        core.warning(`Failed to read file ${file}: ${error}`);
      }
    }));

    const repoReferences = Array.from(repoMap.values());
    core.info(`Found ${repoReferences.length} unique GitHub repositories`);

    // Check archive status and return updated references
    return this.checkArchiveStatus(repoReferences);
  }

  private static async getFilesToScan(excludePatterns: string[]): Promise<string[]> {
    const files = await glob('**/*', {
      ignore: excludePatterns,
      dot: false,
      nodir: true,
    });

    // Filter out binary files
    const textFiles = files.filter((file) => ArchiveScanner.isTextFile(file));

    return textFiles;
  }

  private static isTextFile(filePath: string): boolean {
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
      '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
      '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return !binaryExtensions.includes(ext);
  }

  private static extractGitHubRepos(content: string, filePath: string): Array<{ repo: GitHubRepo, location: FileLocation }> {
    const results: Array<{ repo: GitHubRepo, location: FileLocation }> = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      GITHUB_URL_PATTERNS.forEach((originalPattern) => {
        const pattern = new RegExp(originalPattern.source, originalPattern.flags);
        let match = pattern.exec(line);

        while (match !== null) {
          const owner = match[1];
          const repoName = match[2];

          // Skip if this looks like a file extension or invalid repo name
          if (!repoName.includes('.') || ArchiveScanner.isValidRepoName(repoName)) {
            const repo: GitHubRepo = {
              owner,
              name: repoName.replace(/\.git$/, ''), // Remove .git suffix if present
              url: `https://github.com/${owner}/${repoName}`,
            };

            const location: FileLocation = {
              file: filePath,
              line: lineIndex + 1,
              column: match.index + 1,
              context: line.trim(),
            };

            results.push({ repo, location });
          }

          match = pattern.exec(line);
        }
      });
    });

    return results;
  }

  private static isValidRepoName(name: string): boolean {
    // GitHub repo names can contain dots, but this helps filter out file extensions
    const validRepoPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
    return validRepoPattern.test(name) && name.length <= 100;
  }

  private async checkArchiveStatus(repoReferences: RepoReference[]): Promise<RepoReference[]> {
    core.info('Checking archive status for repositories...');

    const updatedReferences = await Promise.all(repoReferences.map(async (repoRef) => {
      const key = `${repoRef.repo.owner}/${repoRef.repo.name}`;
      let archivedStatus: boolean;

      // Use cached result if available
      if (this.checkedRepos.has(key)) {
        archivedStatus = this.checkedRepos.get(key)!;
      } else {
        try {
          const { data: repo } = await this.octokit.rest.repos.get({
            owner: repoRef.repo.owner,
            repo: repoRef.repo.name,
          });

          archivedStatus = repo.archived;
          this.checkedRepos.set(key, repo.archived);

          if (repo.archived) {
            core.info(`Found archived repository: ${key}`);
          }
        } catch (error: any) {
          // Handle API errors gracefully - don't flag inaccessible repos as archived
          if (error.status === 404) {
            core.warning(`Repository not found: ${key} (private/deleted or insufficient permissions)`);
          } else if (error.status === 403) {
            core.warning(`Access denied to repository: ${key} (insufficient token permissions)`);
          } else {
            core.warning(`Failed to check repository ${key}: ${error.message}`);
          }

          archivedStatus = false;
          this.checkedRepos.set(key, false);
        }
      }

      // Return a new object with updated archived status
      return {
        ...repoRef,
        repo: {
          ...repoRef.repo,
          archived: archivedStatus,
        },
      };
    }));

    return updatedReferences;
  }

  static generateSarifReport(archivedRepos: RepoReference[]): SarifReport {
    const severity = 'error';
    const securitySeverity = '7.0';

    const rule: SarifRule = {
      id: 'archived-dependency',
      name: 'ArchivedDependency',
      shortDescription: {
        text: 'Dependency on archived GitHub repository',
      },
      fullDescription: {
        text: 'This code references a GitHub repository that has been archived. '
              + 'Archived repositories are read-only and no longer maintained, '
              + 'which may pose security and maintenance risks.',
      },
      defaultConfiguration: {
        level: severity,
      },
      help: {
        text: 'Consider migrating to an actively maintained alternative or forking the repository if needed.',
        markdown: '# Archived Repository Dependency\n\n'
                  + 'This code references a GitHub repository that has been archived. '
                  + 'Archived repositories are read-only and no longer receive updates, '
                  + 'which may pose security and maintenance risks.\n\n'
                  + '## Recommendations\n\n'
                  + '1. **Find alternatives**: Look for actively maintained forks or alternative libraries\n'
                  + '2. **Fork if necessary**: If no alternatives exist, consider forking the repository\n'
                  + '3. **Update dependencies**: Remove or replace the dependency if possible\n'
                  + '4. **Monitor security**: Be aware that archived repositories won\'t receive security updates',
      },
      properties: {
        tags: ['security', 'maintenance', 'dependency'],
        'security-severity': securitySeverity,
      },
    };

    const results: SarifResult[] = [];

    archivedRepos.forEach((repoRef) => {
      repoRef.locations.forEach((location) => {
        results.push({
          ruleId: 'archived-dependency',
          message: {
            text: `Dependency on archived repository: ${repoRef.repo.owner}/${repoRef.repo.name}`,
          },
          level: severity,
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: location.file,
              },
              region: {
                startLine: location.line,
                startColumn: location.column,
                endLine: location.line,
                endColumn: location.column + repoRef.repo.url.length,
              },
              contextRegion: {
                startLine: Math.max(1, location.line - 2),
                endLine: location.line + 2,
                snippet: {
                  text: location.context,
                },
              },
            },
          }],
          properties: {
            tags: ['archived-repository', 'security', 'maintenance'],
          },
        });
      });
    });

    return {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'Archived Repository Scanner',
            version: '1.0.0',
            informationUri: 'https://github.com/chanzuckerberg/github-actions',
            rules: [rule],
          },
        },
        results,
      }],
    };
  }
}
