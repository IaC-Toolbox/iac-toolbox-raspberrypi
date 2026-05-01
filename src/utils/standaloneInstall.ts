import fs from 'fs';
import path from 'path';
import { loadCredentials } from './credentials.js';
import {
  buildInstallEnv,
  runInstallScript,
  installScriptExists,
} from './installRunner.js';

/**
 * Check if iac-toolbox.yml exists at the expected path.
 */
function configFileExists(destination: string): boolean {
  const configPath = path.join(destination, 'iac-toolbox.yml');
  return fs.existsSync(configPath);
}

/**
 * Run the standalone install command.
 *
 * Validates that config files exist, loads credentials, builds environment,
 * and spawns install.sh with stdio inheritance.
 */
export async function runStandaloneInstall(
  destination: string,
  profile: string
): Promise<void> {
  // Validate config file exists
  const configPath = path.join(destination, 'iac-toolbox.yml');
  if (!configFileExists(destination)) {
    console.error(
      `Configuration file not found at ${configPath}. Run 'iac-toolbox init' first.`
    );
    process.exit(1);
  }

  // Validate install script exists
  const installScriptPath = path.join(destination, 'scripts', 'install.sh');
  if (!installScriptExists(destination)) {
    console.error(
      `install.sh not found at ${installScriptPath}. Ensure infrastructure files are present.`
    );
    process.exit(1);
  }

  // Load credentials and build environment
  const credentials = loadCredentials(profile);
  const env = buildInstallEnv(
    profile,
    credentials.docker_hub_username,
    credentials.docker_image_name
  );

  // Add additional credentials that may be used by the install script
  if (credentials.cloudflare_api_token) {
    env.CLOUDFLARE_API_TOKEN = credentials.cloudflare_api_token;
  }
  if (credentials.grafana_admin_password) {
    env.GRAFANA_ADMIN_PASSWORD = credentials.grafana_admin_password;
  }

  // Run the install script in interactive mode (inherits stdio for password prompts)
  const result = await runInstallScript(destination, env);

  // Exit with the same code as install.sh
  process.exit(result.exitCode ?? 1);
}
