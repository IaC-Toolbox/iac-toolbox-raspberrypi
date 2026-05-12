import fs from 'fs';
import { loadCredentials } from '../utils/credentials.js';
import {
  buildInstallEnv,
  runInstallScript,
  installScriptExists,
} from '../utils/installRunner.js';
import { buildTargetEnv } from '../utils/targetConfig.js';

/**
 * Run the install using a per-device config file path.
 *
 * @param filePath  Path to iac-toolbox.yml
 * @param destination  Path to infrastructure directory (defaults to 'infrastructure')
 */
export async function runFilePathInstall(
  filePath: string,
  destination: string = 'infrastructure'
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.error(`Config file not found: ${filePath}`);
    process.exit(1);
  }

  if (!installScriptExists(destination)) {
    console.error(
      `install.sh not found in ${destination}. Ensure infrastructure files are present.`
    );
    process.exit(1);
  }

  const credentials = loadCredentials('default');
  const env = buildInstallEnv(
    'default',
    credentials.docker_hub_username,
    credentials.docker_image_name
  );

  const targetEnv = buildTargetEnv(destination);
  Object.assign(env, targetEnv);

  if (credentials.cloudflare_api_token) {
    env.CLOUDFLARE_API_TOKEN = credentials.cloudflare_api_token;
  }
  if (credentials.grafana_admin_password) {
    env.GRAFANA_ADMIN_PASSWORD = credentials.grafana_admin_password;
  }

  // Pass the config file path for ansible to pick up
  env.IAC_TOOLBOX_CONFIG_FILE = filePath;

  const result = await runInstallScript(destination, env);
  process.exit(result.exitCode ?? 1);
}

/**
 * Alias used by the legacy init --filePath path.
 */
export async function runFilePathInit(filePath: string): Promise<void> {
  await runFilePathInstall(filePath);
}
