import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { getOctokit } from '@actions/github';
import { ArchiveScanner } from './scanner';

async function uploadSarifToCodeScanning(sarifPath: string, githubToken: string): Promise<void> {
  try {
    const octokit = getOctokit(githubToken);
    const sarifContent = await fs.promises.readFile(sarifPath, 'utf8');
    
    // GitHub API requires SARIF to be gzip-compressed and base64-encoded
    const gzippedSarif = zlib.gzipSync(Buffer.from(sarifContent, 'utf8'));
    const sarifBase64 = gzippedSarif.toString('base64');
    
    const repo = process.env.GITHUB_REPOSITORY;
    const ref = process.env.GITHUB_SHA;
    
    if (!repo || !ref) {
      throw new Error('Missing required environment variables GITHUB_REPOSITORY or GITHUB_SHA');
    }
    
    const [owner, repoName] = repo.split('/');
    
    await octokit.rest.codeScanning.uploadSarif({
      owner,
      repo: repoName,
      commit_sha: ref,
      ref: process.env.GITHUB_REF || `refs/heads/${process.env.GITHUB_REF_NAME || 'main'}`,
      sarif: sarifBase64,
      tool_name: 'Archived Repository Scanner'
    });
    
    core.info('✅ SARIF uploaded to GitHub Code Scanning');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.warning(`Failed to upload SARIF: ${errorMessage}`);
  }
}

async function createJobSummary(allRepos: any[], archivedRepos: any[], severity: string): Promise<void> {
  try {
    core.summary
      .addHeading('🔍 Archived Repository Scanner Results')
      .addTable([
        [{ data: 'Metric', header: true }, { data: 'Count', header: true }],
        ['Total repositories found', allRepos.length.toString()],
        ['Archived repositories', archivedRepos.length.toString()],
        ['Severity level', severity]
      ]);

    if (archivedRepos.length > 0) {
      core.summary
        .addHeading('📋 Archived Repositories', 3)
        .addTable([
          [{ data: 'Repository', header: true }, { data: 'Locations', header: true }],
          ...archivedRepos.map((repoRef: any) => [
            `[${repoRef.repo.owner}/${repoRef.repo.name}](${repoRef.repo.url})`,
            repoRef.locations.length.toString()
          ])
        ]);
    }

    await core.summary.write();
  } catch (error) {
    core.warning(`Failed to write job summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function run(): Promise<void> {
  // Initialize outputs early to ensure they're always set
  core.setOutput('total_github_links', '0');
  core.setOutput('archived_repos_found', '0');
  core.setOutput('sarif_file_path', '');

  try {
    // Parse and validate inputs
    const githubToken = core.getInput('github_token', { required: true });
    const includePatterns = core.getInput('include_patterns')
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    const excludePatterns = core.getInput('exclude_patterns')
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    const severity = core.getInput('severity') as 'error' | 'warning' | 'note';
    const failOnArchived = core.getInput('fail_on_archived').toLowerCase() === 'true';
    const uploadSarif = core.getInput('upload_sarif').toLowerCase() === 'true';

    if (!['error', 'warning', 'note'].includes(severity)) {
      throw new Error(`Invalid severity level: ${severity}. Must be one of: error, warning, note`);
    }

    // Scan repository and identify archived dependencies
    const scanner = new ArchiveScanner(githubToken);
    const allRepos = await scanner.scanRepository(includePatterns, excludePatterns);
    const archivedRepos = allRepos.filter(repoRef => repoRef.repo.archived === true);

    core.info(`📊 Found ${allRepos.length} repositories, ${archivedRepos.length} archived`);

    // Set action outputs
    core.setOutput('total_github_links', allRepos.length.toString());
    core.setOutput('archived_repos_found', archivedRepos.length.toString());

    // Generate and upload SARIF report
    const sarifReport = scanner.generateSarifReport(archivedRepos, severity);
    const sarifPath = path.join(process.cwd(), 'archived-repos-scan.sarif');
    await fs.promises.writeFile(sarifPath, JSON.stringify(sarifReport, null, 2));
    core.setOutput('sarif_file_path', sarifPath);

    if (uploadSarif) {
      await uploadSarifToCodeScanning(sarifPath, githubToken);
    }

    if (archivedRepos.length > 0) {
      // Log details about archived repositories
      core.startGroup('📋 Archived Repository Details');
      for (const repoRef of archivedRepos) {
        core.info(`🗄️ ${repoRef.repo.owner}/${repoRef.repo.name} (${repoRef.locations.length} locations)`);
        for (const location of repoRef.locations) {
          core.info(`  - ${location.file}:${location.line}`);
        }
      }
      core.endGroup();

      await createJobSummary(allRepos, archivedRepos, severity);

      // Set action result based on configuration
      const message = `Found ${archivedRepos.length} archived repository dependencies. Check the Security tab for details.`;
      if (failOnArchived && severity === 'error') {
        core.setFailed(message);
      } else if (failOnArchived) {
        core.warning(message);
      } else {
        core.info(message);
      }
    } else {
      await createJobSummary(allRepos, archivedRepos, severity);
      core.info('✅ No archived repository dependencies found!');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

// Execute the action
run();

export { run }; 