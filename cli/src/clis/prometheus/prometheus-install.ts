import { loadCredentials } from '../../loaders/credentials-loader.js';
import { pollHealth } from '../../utils/healthCheck.js';
import { print } from '../../design-system/print.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';

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
  print.step('Reading Prometheus configuration...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

  // ── Missing Credentials Guard ─────────────────────────────
  if (!creds.grafana_admin_password) {
    print.error('Grafana credentials not found');
    print.pipe();
    print.pipe(
      'Prometheus registers itself as a Grafana datasource during install.'
    );
    print.pipe(
      'Run `iac-toolbox grafana init` first to set up Grafana credentials.'
    );
    print.closeError();
    process.exit(1);
  }

  print.success('Configuration loaded');
  print.pipe();

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
  print.step('Installing Prometheus...');
  print.divider();

  const env = {
    ...process.env,
    GRAFANA_ADMIN_USER: adminUser,
    GRAFANA_ADMIN_PASSWORD: creds.grafana_admin_password,
    GRAFANA_PORT: grafanaPort,
  };

  const status = runAnsiblePlaybook('prometheus.yml', {
    ansibleDir: resolveAnsibleDir(destination),
    filePath,
    projectRoot: resolveProjectRoot(),
    env,
  });

  if (status !== 0) {
    print.blank();
    print.step('Prometheus install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox prometheus install');
    print.closeError();
    process.exit(status);
  }

  // ── Post-Install Health Check ─────────────────────────────
  const prometheusPort =
    (config.prometheus?.port as number | undefined) ?? 9090;
  const prometheusDomain = config.prometheus?.domain as string | undefined;
  const cloudflareEnabled =
    config.cloudflare && (config.cloudflare as Record<string, unknown>).enabled;
  const healthUrl =
    cloudflareEnabled && prometheusDomain
      ? `https://${prometheusDomain}/-/healthy`
      : `http://localhost:${prometheusPort}/-/healthy`;

  print.waiting('Waiting for Prometheus to be healthy...');

  const healthy = await pollHealth(healthUrl, {
    retries: 30,
    delayMs: 2000,
  });

  if (healthy) {
    print.blank();
    print.step('Prometheus installed successfully');
    print.pipe();
    print.success('Health check passed');
    print.pipe();
    if (cloudflareEnabled && prometheusDomain) {
      print.pipe(`Public URL          https://${prometheusDomain}`);
    } else {
      print.pipe(`Prometheus URL      http://localhost:${prometheusPort}`);
    }
    print.pipe('Node Exporter URL   http://localhost:9100/metrics');
    print.pipe('Grafana datasource  auto-configured');
    print.pipe('Dashboard           Node Exporter Full (auto-imported)');
    print.pipe(
      `Retention           ${(config.prometheus?.retention as string | undefined) ?? '15d'}`
    );
    print.pipe(
      `Scrape interval     ${(config.prometheus?.scrape_interval as string | undefined) ?? '15s'}`
    );
    print.pipe();
    print.pipe('Run `iac-toolbox prometheus uninstall` to remove');
    print.close();
  } else {
    print.blank();
    print.step('Prometheus install failed');
    print.pipe();
    print.error('Health check did not pass after 60 seconds');
    print.pipe('Check Ansible output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox prometheus install');
    print.closeError();
    process.exit(1);
  }
}
