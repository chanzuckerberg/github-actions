import * as core from '@actions/core';
import * as fs from 'fs';

/**
 * Exports provider credentials from convention-based secrets.
 * 
 * Convention:
 *   TF_ENV_<NAME> -> exported as env <NAME> (e.g. TF_ENV_OKTA_API_TOKEN -> OKTA_API_TOKEN)
 *   TF_VAR_<name> -> exported as-is (Terraform input variable)
 * 
 * Each value is masked. Ignores github_token/GITHUB_TOKEN.
 */
export async function run(): Promise<void> {
  const allSecrets = process.env.ALL_SECRETS;
  if (!allSecrets) {
    core.info('No ALL_SECRETS environment variable found; skipping provider env export');
    return;
  }

  let secrets: Record<string, string>;
  try {
    secrets = JSON.parse(allSecrets);
  } catch (error) {
    throw new Error(`Failed to parse ALL_SECRETS: ${error instanceof Error ? error.message : String(error)}`);
  }

  const envVars: string[] = [];
  let exportedCount = 0;

  for (const [key, value] of Object.entries(secrets)) {
    if (key === 'github_token' || key === 'GITHUB_TOKEN') {
      continue;
    }

    let envName: string | null = null;

    if (key.startsWith('TF_ENV_')) {
      envName = key.slice('TF_ENV_'.length);
      exportedCount++;
      core.info(`Exporting TF_ENV_${envName} as ${envName}`);
    } else if (key.startsWith('TF_VAR_')) {
      envName = key;
      exportedCount++;
      core.info(`Exporting ${key} as Terraform variable`);
    }

    if (envName) {
      core.setSecret(value);
      envVars.push(`${envName}<<__TF_ENV_EOF__\n${value}\n__TF_ENV_EOF__`);
    }
  }

  if (envVars.length > 0) {
    const githubEnv = process.env.GITHUB_ENV;
    if (!githubEnv) {
      throw new Error('GITHUB_ENV environment variable not set');
    }
    fs.appendFileSync(githubEnv, envVars.join('\n') + '\n');
    core.info(`Exported ${exportedCount} provider credential(s)`);
  } else {
    core.info('No TF_ENV_ or TF_VAR_ secrets found');
  }
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
