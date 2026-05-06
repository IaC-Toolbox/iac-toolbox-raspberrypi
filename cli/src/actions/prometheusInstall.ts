import { spawnSync } from 'child_process';
import { loadCredentials } from '../utils/credentials.js';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollHealth } from '../utils/healthCheck.js';
import { buildTargetEnv } from '../utils/targetConfig.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  prometheus?: {
    grafana_url?: string;
    [key: string]: unknown;
  };
  grafana?: {
    admin_user?: string;
    [key: string]: unknown;
  };
}

/**
 * Run `iac-toolbox prometheus install`.
 *
 * Reads config from iac-toolbox.yml and Grafana credentials from
 * ~/.iac-toolbox/credentials, then invokes install.sh --prometheus --local.
 * Fails immediately if Grafana credentials are missing.
 */
export async function runPrometheusInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  console.log('◆  Reading Prometheus configuration...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

  // ── Missing Credentials Guard ─────────────────────────────
  if (!creds.grafana_admin_password) {
    console.error('│  ✗ Grafana credentials not found');
    console.error('│');
    console.error(
      '│  Prometheus registers itself as a Grafana datasource during install.'
    );
    console.error(
      '│  Run `iac-toolbox grafana init` first to set up Grafana credentials.'
    );
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Configuration loaded');
  console.log('│');

  // ── Parse Grafana URL and Port ────────────────────────────
  const grafanaUrl =
    (config.prometheus?.grafana_url as string) ?? 'http://localhost:3000';
  let grafanaPort = '3000';
  try {
    const parsed = new URL(grafanaUrl);
    grafanaPort = parsed.port || '3000';
  } catch {
    // Invalid URL — use default port
  }

  const adminUser =
    (config.grafana?.admin_user as string) ??
    creds.grafana_admin_user ??
    'admin';

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing Prometheus...');
  console.log('│  ══════════════════════════════════════');

  const targetEnv = buildTargetEnv(destination);
  const env = {
    ...process.env,
    ...targetEnv,
    GRAFANA_ADMIN_USER: adminUser,
    GRAFANA_ADMIN_PASSWORD: creds.grafana_admin_password,
    GRAFANA_PORT: grafanaPort,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const result = spawnSync('bash', [scriptPath, '--prometheus', '--local'], {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('');
    console.error('◆  Prometheus install failed');
    console.error('│');
    console.error('│  ✗ Ansible playbook exited with errors');
    console.error('│  Check output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox prometheus install');
    console.error('└');
    process.exit(result.status ?? 1);
  }

  // ── Post-Install Health Check ─────────────────────────────
  console.log('│  ◜ Waiting for Prometheus to be healthy...');

  const healthy = await pollHealth('http://localhost:9090/-/healthy', {
    retries: 30,
    delayMs: 2000,
  });

  if (healthy) {
    console.log('');
    console.log('◆  Prometheus installed successfully');
    console.log('│');
    console.log('│  ✔ Health check passed');
    console.log('│');
    console.log('│  Prometheus URL      http://localhost:9090');
    console.log('│  Node Exporter URL   http://localhost:9100/metrics');
    console.log('│  Grafana datasource  auto-configured');
    console.log('│  Dashboard           Node Exporter Full (auto-imported)');
    console.log('│  Retention           15d');
    console.log('│  Scrape interval     15s');
    console.log('│');
    console.log('│  Run `iac-toolbox prometheus uninstall` to remove');
    console.log('└');
  } else {
    console.error('');
    console.error('◆  Prometheus install failed');
    console.error('│');
    console.error('│  ✗ Health check did not pass after 60 seconds');
    console.error('│  Check Ansible output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox prometheus install');
    console.error('└');
    process.exit(1);
  }
}
