import { spawnSync } from 'child_process';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollHealth } from '../utils/healthCheck.js';
import { buildTargetEnv } from '../utils/targetConfig.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  grafana_alloy?: {
    alloy_remote_write_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Run `iac-toolbox metrics-agent install`.
 *
 * Reads alloy_remote_write_url from iac-toolbox.yml, then invokes
 * install.sh --metrics-agent --local with ALLOY_REMOTE_WRITE_URL in env.
 * Fails immediately if the remote_write URL is missing.
 */
export async function runMetricsAgentInstall(
  destination: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  console.log('◆  Reading metrics agent configuration...');
  const config = loadIacToolboxYaml(destination) as IacToolboxConfig;

  const remoteWriteUrl = config.grafana_alloy?.alloy_remote_write_url;

  // ── Missing Config Guard ──────────────────────────────────
  if (!remoteWriteUrl) {
    console.error('│  ✗ Metrics agent not configured');
    console.error('│');
    console.error(
      '│  Run `iac-toolbox metrics-agent init` first to set the remote_write URL.'
    );
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Configuration loaded');
  console.log('│');

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing metrics agent...');
  console.log('│  ════════════════════════════════════════');

  const targetEnv = buildTargetEnv(destination);
  const env = {
    ...process.env,
    ...targetEnv,
    ALLOY_REMOTE_WRITE_URL: remoteWriteUrl,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const result = spawnSync('bash', [scriptPath, '--metrics-agent', '--local'], {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('');
    console.error('◆  Metrics agent install failed');
    console.error('│');
    console.error('│  ✗ Ansible playbook exited with errors');
    console.error('│  Check output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox metrics-agent install');
    console.error('└');
    process.exit(result.status ?? 1);
  }

  // ── Post-Install Health Checks ────────────────────────────
  console.log('│  ◜ Waiting for Node Exporter to be healthy...');

  const nodeExporterHealthy = await pollHealth(
    'http://localhost:9100/metrics',
    {
      retries: 30,
      delayMs: 2000,
    }
  );

  console.log('│  ◜ Waiting for Grafana Alloy to be ready...');

  const alloyHealthy = await pollHealth('http://localhost:12345/-/ready', {
    retries: 30,
    delayMs: 2000,
  });

  if (nodeExporterHealthy && alloyHealthy) {
    console.log('');
    console.log('◆  Metrics agent installed successfully');
    console.log('│');
    console.log('│  ✔ Node Exporter healthy');
    console.log('│  ✔ Grafana Alloy ready');
    console.log('│');
    console.log('│  Node Exporter     http://localhost:9100/metrics');
    console.log('│  Alloy UI          http://localhost:12345');
    console.log(`│  Remote write →    ${remoteWriteUrl}`);
    console.log('│');
    console.log('│  Run `iac-toolbox metrics-agent uninstall` to remove');
    console.log('└');
  } else {
    console.error('');
    console.error('◆  Metrics agent install failed');
    console.error('│');
    if (!nodeExporterHealthy) {
      console.error(
        '│  ✗ Node Exporter health check did not pass after 60 seconds'
      );
    }
    if (!alloyHealthy) {
      console.error(
        '│  ✗ Grafana Alloy health check did not pass after 60 seconds'
      );
    }
    console.error('│  Check Ansible output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox metrics-agent install');
    console.error('└');
    process.exit(1);
  }
}
