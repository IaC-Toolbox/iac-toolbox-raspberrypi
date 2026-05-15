import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { loadCredentials } from '../../loaders/credentials-loader.js';
import { pollHealth } from '../../validators/health_check.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  prometheus?: {
    grafana_url?: string;
    port?: number;
    domain?: string;
    retention?: string;
    scrape_interval?: string;
    [key: string]: unknown;
  };
  grafana?: {
    admin_user?: string;
    [key: string]: unknown;
  };
  cloudflare?: { enabled?: boolean; [key: string]: unknown };
}

export async function runPrometheusInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const creds = loadCredentials(profile);

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

  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  print.success('Configuration loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing Prometheus...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('prometheus.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env,
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('Prometheus install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox prometheus install');
    print.closeError();
    process.exit(status ?? 1);
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

  const healthy = await pollHealth(healthUrl, { retries: 30, delayMs: 2000 });

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
    print.pipe(`Retention           ${config.prometheus?.retention ?? '15d'}`);
    print.pipe(
      `Scrape interval     ${config.prometheus?.scrape_interval ?? '15s'}`
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
