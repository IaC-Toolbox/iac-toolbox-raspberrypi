import { spawnSync } from 'child_process';
import { loadCredentials } from '../utils/credentials.js';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollHealth } from '../utils/healthCheck.js';

/**
 * Run `iac-toolbox grafana install`.
 *
 * Reads credentials from file (no wizard), invokes install.sh --grafana --local,
 * and performs a post-install health check.
 */
export async function runGrafanaInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // ── Missing Credentials Guard ─────────────────────────────
  console.log('◆  Reading Grafana credentials...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination, filePath);

  if (!creds.grafana_admin_password) {
    console.error('│  ✗ No credentials found');
    console.error('│');
    console.error(
      '│  Run `iac-toolbox grafana init` first to set up credentials'
    );
    console.error('└');
    process.exit(1);
  }

  const adminUser =
    (config.grafana?.admin_user as string) ??
    creds.grafana_admin_user ??
    'admin';

  console.log('│  ✔ Credentials loaded');
  console.log('│');

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing Grafana...');
  console.log('│  ══════════════════════════════════════');

  const env = {
    ...process.env,
    GRAFANA_ADMIN_USER: adminUser,
    GRAFANA_ADMIN_PASSWORD: creds.grafana_admin_password,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--grafana'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('');
    console.error('◆  Grafana install failed');
    console.error('│');
    console.error('│  ✗ Ansible playbook exited with errors');
    console.error('│  Check output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox grafana install');
    console.error('└');
    process.exit(result.status ?? 1);
  }

  // ── Post-Install Health Check ─────────────────────────────
  const grafanaPort = (config.grafana?.port as number | undefined) ?? 3000;
  const grafanaDomain = config.grafana?.domain as string | undefined;
  const cloudflareEnabled =
    config.cloudflare && (config.cloudflare as Record<string, unknown>).enabled;
  const healthUrl =
    cloudflareEnabled && grafanaDomain
      ? `https://${grafanaDomain}/api/health`
      : `http://localhost:${grafanaPort}/api/health`;

  console.log('│  ◜ Waiting for Grafana to be healthy...');

  const healthy = await pollHealth(healthUrl, {
    retries: 30,
    delayMs: 2000,
  });

  if (healthy) {
    console.log('');
    console.log('◆  Grafana installed successfully');
    console.log('│');
    console.log('│  ✔ Health check passed');
    console.log('│');
    if (cloudflareEnabled && grafanaDomain) {
      console.log(`│  Public URL   https://${grafanaDomain}`);
    } else {
      console.log(`│  Local URL    http://localhost:${grafanaPort}`);
    }
    console.log(`│  Username     ${adminUser}`);
    console.log('│  Password     saved to ~/.iac-toolbox/credentials');
    console.log('│');
    console.log('│  Run `iac-toolbox grafana uninstall` to remove');
    console.log('└');
  } else {
    console.error('');
    console.error('◆  Grafana install failed');
    console.error('│');
    console.error('│  ✗ Health check did not pass after 60 seconds');
    console.error('│  Check Ansible output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox grafana install');
    console.error('└');
    process.exit(1);
  }
}
