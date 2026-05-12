import { spawnSync } from 'child_process';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollDockerHealth, pollHealth } from '../utils/healthCheck.js';
import { print } from '../utils/print.js';

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
  destination: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  print.step('Reading metrics agent configuration...');
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

  const remoteWriteUrl = config.grafana_alloy?.alloy_remote_write_url;

  // ── Missing Config Guard ──────────────────────────────────
  if (!remoteWriteUrl) {
    print.error('Metrics agent not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox metrics-agent init` first to set the remote_write URL.'
    );
    print.closeError();
    process.exit(1);
  }

  print.success('Configuration loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing metrics agent...');
  print.divider();

  const env = {
    ...process.env,
    ALLOY_REMOTE_WRITE_URL: remoteWriteUrl,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--metrics-agent'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    print.blank();
    print.step('Metrics agent install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox metrics-agent install');
    print.closeError();
    process.exit(result.status ?? 1);
  }

  // ── Post-Install Health Checks ────────────────────────────
  print.waiting('Waiting for Node Exporter to be healthy...');

  const nodeExporterHealthy = await pollHealth(
    'http://localhost:9100/metrics',
    {
      retries: 30,
      delayMs: 2000,
    }
  );

  print.waiting('Waiting for Grafana Alloy to be ready...');

  // On macOS, Alloy runs in Docker (Rancher Desktop) so localhost ports are
  // not forwarded to the host. Use docker inspect instead of an HTTP check.
  const isMacOS = process.platform === 'darwin';
  const alloyHealthy = isMacOS
    ? await pollDockerHealth('grafana-alloy', { retries: 30, delayMs: 2000 })
    : await pollHealth('http://localhost:12345/-/ready', {
        retries: 30,
        delayMs: 2000,
      });

  if (nodeExporterHealthy && alloyHealthy) {
    print.blank();
    print.step('Metrics agent installed successfully');
    print.pipe();
    print.success('Node Exporter healthy');
    print.success('Grafana Alloy ready');
    print.pipe();
    print.pipe('Node Exporter     http://localhost:9100/metrics');
    print.pipe('Alloy UI          http://localhost:12345');
    print.pipe(`Remote write →    ${remoteWriteUrl}`);
    print.pipe();
    print.pipe('Run `iac-toolbox metrics-agent uninstall` to remove');
    print.close();
  } else {
    print.blank();
    print.step('Metrics agent install failed');
    print.pipe();
    if (!nodeExporterHealthy) {
      print.error('Node Exporter health check did not pass after 60 seconds');
    }
    if (!alloyHealthy) {
      print.error('Grafana Alloy health check did not pass after 60 seconds');
    }
    print.pipe('Check Ansible output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox metrics-agent install');
    print.closeError();
    process.exit(1);
  }
}
