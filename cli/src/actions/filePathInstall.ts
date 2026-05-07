import { spawnSync } from 'child_process';
import path from 'path';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { loadCredentials } from '../utils/credentials.js';

/**
 * Run a full install using a per-device config file path.
 * Invokes install.sh with --filePath and --local flags.
 */
export async function runFilePathInstall(
  filePath: string,
  destination: string
): Promise<void> {
  const config = loadIacToolboxYaml(destination, filePath);
  const creds = loadCredentials('default');

  const env = {
    ...process.env,
    ALLOY_REMOTE_WRITE_URL:
      (config as { grafana_alloy?: { alloy_remote_write_url?: string } })
        .grafana_alloy?.alloy_remote_write_url || '',
    GRAFANA_ADMIN_USER: creds.grafana_admin_user || '',
    GRAFANA_ADMIN_PASSWORD: creds.grafana_admin_password || '',
  };

  const scriptPath = path.join(destination, 'scripts', 'install.sh');
  const result = spawnSync(
    'bash',
    [scriptPath, '--filePath', filePath, '--local'],
    { env, stdio: 'inherit' }
  );
  process.exit(result.status ?? 1);
}

/**
 * Run init (write config) using a per-device config file path.
 */
export async function runFilePathInit(filePath: string): Promise<void> {
  console.log(`Initializing configuration from: ${filePath}`);
  // Config file is used directly — no wizard needed
  process.exit(0);
}
