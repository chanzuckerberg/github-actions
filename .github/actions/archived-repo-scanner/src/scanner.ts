import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { GitHubRepo, RepoReference, FileLocation, SarifReport, SarifResult, SarifRule } from './types';

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

  async scanRepository(
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<RepoReference[]> {
    core.info('Starting repository scan for GitHub links...');
    
    const files = await this.getFilesToScan(includePatterns, excludePatterns);
    core.info(`Found ${files.length} files to scan`);

    const repoMap = new Map<string, RepoReference>();

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const repos = this.extractGitHubRepos(content, file);
        
        for (const { repo, location } of repos) {
          const key = `${repo.owner}/${repo.name}`;
          if (repoMap.has(key)) {
            repoMap.get(key)!.locations.push(location);
          } else {
            repoMap.set(key, { repo, locations: [location] });
          }
        }
      } catch (error) {
        core.warning(`Failed to read file ${file}: ${error}`);
      }
    }

    const repoReferences = Array.from(repoMap.values());
    core.info(`Found ${repoReferences.length} unique GitHub repositories`);

    // Check archive status for all repositories
    await this.checkArchiveStatus(repoReferences);

    return repoReferences;
  }

  private async getFilesToScan(
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of includePatterns) {
      const files = await glob(pattern, {
        ignore: excludePatterns,
        dot: false,
        nodir: true,
      });
      allFiles.push(...files);
    }

    // Remove duplicates and filter out binary files
    const uniqueFiles = [...new Set(allFiles)];
    const textFiles = uniqueFiles.filter(file => this.isTextFile(file));
    
    return textFiles;
  }

  private isTextFile(filePath: string): boolean {
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
      '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
      '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
      '.woff', '.woff2', '.ttf', '.eot', '.otf'
    ];

    const ext = path.extname(filePath).toLowerCase();
    return !binaryExtensions.includes(ext);
  }

  private extractGitHubRepos(content: string, filePath: string): Array<{repo: GitHubRepo, location: FileLocation}> {
    const results: Array<{repo: GitHubRepo, location: FileLocation}> = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of GITHUB_URL_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex global state
        let match;
        
        while ((match = pattern.exec(line)) !== null) {
          const owner = match[1];
          const repoName = match[2];
          
          // Skip if this looks like a file extension or invalid repo name
          if (repoName.includes('.') && !this.isValidRepoName(repoName)) {
            continue;
          }

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
      }
    }

    return results;
  }

  private isValidRepoName(name: string): boolean {
    // GitHub repo names can contain dots, but this helps filter out file extensions
    const validRepoPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
    return validRepoPattern.test(name) && name.length <= 100;
  }

  private async checkArchiveStatus(repoReferences: RepoReference[]): Promise<void> {
    core.info('Checking archive status for repositories...');
    
    for (const repoRef of repoReferences) {
      const key = `${repoRef.repo.owner}/${repoRef.repo.name}`;
      
      if (this.checkedRepos.has(key)) {
        repoRef.repo.archived = this.checkedRepos.get(key);
        continue;
      }

      try {
        const { data: repo } = await this.octokit.rest.repos.get({
          owner: repoRef.repo.owner,
          repo: repoRef.repo.name,
        });

        repoRef.repo.archived = repo.archived;
        this.checkedRepos.set(key, repo.archived);
        
        if (repo.archived) {
          core.info(`Found archived repository: ${key}`);
        }
      } catch (error: any) {
        if (error.status === 404) {
          core.warning(`Repository not found: ${key} (may be private or deleted)`);
          repoRef.repo.archived = false; // Don't flag missing repos as archived
        } else {
          core.warning(`Failed to check repository ${key}: ${error.message}`);
          repoRef.repo.archived = false; // Default to not archived on error
        }
        this.checkedRepos.set(key, false);
      }
    }
  }

  generateSarifReport(
    archivedRepos: RepoReference[],
    severity: 'error' | 'warning' | 'note' = 'error'
  ): SarifReport {
    const rule: SarifRule = {
      id: 'archived-dependency',
      name: 'ArchivedDependency',
      shortDescription: {
        text: 'Dependency on archived GitHub repository',
      },
      fullDescription: {
        text: 'This code references a GitHub repository that has been archived. Archived repositories are read-only and no longer maintained, which may pose security and maintenance risks.',
      },
      defaultConfiguration: {
        level: severity,
      },
      help: {
        text: 'Consider migrating to an actively maintained alternative or forking the repository if needed.',
        markdown: '# Archived Repository Dependency\n\nThis code references a GitHub repository that has been archived. Archived repositories are read-only and no longer receive updates, which may pose security and maintenance risks.\n\n## Recommendations\n\n1. **Find alternatives**: Look for actively maintained forks or alternative libraries\n2. **Fork if necessary**: If no alternatives exist, consider forking the repository\n3. **Update dependencies**: Remove or replace the dependency if possible\n4. **Monitor security**: Be aware that archived repositories won\'t receive security updates',
      },
      properties: {
        tags: ['security', 'maintenance', 'dependency'],
        'security-severity': severity === 'error' ? '7.0' : severity === 'warning' ? '5.0' : '3.0',
      },
    };

    const results: SarifResult[] = [];

    for (const repoRef of archivedRepos) {
      for (const location of repoRef.locations) {
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
      }
    }

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