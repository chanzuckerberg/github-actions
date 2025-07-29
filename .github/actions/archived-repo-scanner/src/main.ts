import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { ArchiveScanner } from './scanner';

async function run(): Promise<void> {
  // Initialize outputs early to ensure they're always set
  core.setOutput('total_github_links', '0');
  core.setOutput('archived_repos_found', '0');
  core.setOutput('sarif_file_path', '');

  try {
    // Get inputs from the action
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

    // Validate severity input
    if (!['error', 'warning', 'note'].includes(severity)) {
      throw new Error(`Invalid severity level: ${severity}. Must be one of: error, warning, note`);
    }

    core.info('🔍 Starting archived repository scan...');
    core.info(`Include patterns: ${includePatterns.join(', ')}`);
    core.info(`Exclude patterns: ${excludePatterns.join(', ')}`);
    core.info(`Severity level: ${severity}`);

    // Initialize the scanner
    const scanner = new ArchiveScanner(githubToken);

    // Scan the repository for GitHub links
    const allRepos = await scanner.scanRepository(includePatterns, excludePatterns);
    
    // Filter for archived repositories
    const archivedRepos = allRepos.filter(repoRef => repoRef.repo.archived === true);

    core.info(`📊 Scan Results:`);
    core.info(`  Total GitHub repositories found: ${allRepos.length}`);
    core.info(`  Archived repositories found: ${archivedRepos.length}`);

    // Set outputs
    core.setOutput('total_github_links', allRepos.length.toString());
    core.setOutput('archived_repos_found', archivedRepos.length.toString());
    
    core.info(`📤 Outputs set:`);
    core.info(`  total_github_links: ${allRepos.length}`);
    core.info(`  archived_repos_found: ${archivedRepos.length}`);

    if (archivedRepos.length > 0) {
      // Generate SARIF report
      const sarifReport = scanner.generateSarifReport(archivedRepos, severity);
      
      // Write SARIF file
      const sarifPath = path.join(process.cwd(), 'archived-repos-scan.sarif');
      await fs.promises.writeFile(sarifPath, JSON.stringify(sarifReport, null, 2));
      
      core.setOutput('sarif_file_path', sarifPath);
      
      core.info(`📝 SARIF report generated: ${sarifPath}`);
      
      // Log details about archived repositories
      core.startGroup('📋 Archived Repositories Details');
      for (const repoRef of archivedRepos) {
        core.info(`\n🗄️ ${repoRef.repo.owner}/${repoRef.repo.name}`);
        core.info(`   URL: ${repoRef.repo.url}`);
        core.info(`   Found in ${repoRef.locations.length} location(s):`);
        for (const location of repoRef.locations) {
          core.info(`     - ${location.file}:${location.line}:${location.column}`);
          core.info(`       Context: ${location.context}`);
        }
      }
      core.endGroup();

      // Create summary
      core.summary
        .addHeading('🔍 Archived Repository Scanner Results')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Count', header: true }
          ],
          ['Total GitHub repositories found', allRepos.length.toString()],
          ['Archived repositories found', archivedRepos.length.toString()],
          ['Severity level', severity]
        ]);

      if (archivedRepos.length > 0) {
        core.summary
          .addHeading('📋 Archived Repositories', 3)
          .addTable([
            [
              { data: 'Repository', header: true },
              { data: 'Locations', header: true },
              { data: 'Files', header: true }
            ],
            ...archivedRepos.map(repoRef => [
              `[${repoRef.repo.owner}/${repoRef.repo.name}](${repoRef.repo.url})`,
              repoRef.locations.length.toString(),
              repoRef.locations.map(loc => `${loc.file}:${loc.line}`).join('<br>')
            ])
          ]);
      }

      await core.summary.write();

      if (severity === 'error') {
        core.setFailed(`Found ${archivedRepos.length} archived repository dependencies. Check the Security tab for details.`);
      } else {
        core.warning(`Found ${archivedRepos.length} archived repository dependencies. Check the Security tab for details.`);
      }
    } else {
      core.info('✅ No archived repository dependencies found!');
      
      // Still create an empty SARIF file for consistency
      const emptySarifReport = scanner.generateSarifReport([], severity);
      const sarifPath = path.join(process.cwd(), 'archived-repos-scan.sarif');
      await fs.promises.writeFile(sarifPath, JSON.stringify(emptySarifReport, null, 2));
      core.setOutput('sarif_file_path', sarifPath);

      core.summary
        .addHeading('🔍 Archived Repository Scanner Results')
        .addRaw('✅ No archived repository dependencies found!')
        .addTable([
          [
            { data: 'Metric', header: true },
            { data: 'Count', header: true }
          ],
          ['Total GitHub repositories found', allRepos.length.toString()],
          ['Archived repositories found', '0']
        ]);

      await core.summary.write();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
    
    // Set outputs even on failure
    core.setOutput('total_github_links', '0');
    core.setOutput('archived_repos_found', '0');
    core.setOutput('sarif_file_path', '');
  }
}

// Only run if this is the main module
if (require.main === module) {
  run();
}

export { run }; 