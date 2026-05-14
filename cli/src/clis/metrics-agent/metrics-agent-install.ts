import { loadMetricsAgentConfig } from './metrics-agent-config.js';
import { pollDockerHealth, pollHealth } from '../../validators/health_check.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';

/**
 * Run `iac-toolbox metrics-agent install`.
 *
 * Reads grafana_url and prometheus_remote_write_url from iac-toolbox.yml,
 * then invokes runAnsiblePlaybook('metrics-agent.yml') with ALLOY_REMOTE_WRITE_URL
 * in the environment.
 * Fails immediately if prometheus_remote_write_url is missing.
 */
export async function runMetricsAgentInstall(
  destination: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  print.step('Reading agent configuration...');
  const config = loadMetricsAgentConfig(destination);

  const prometheusRemoteWriteUrl = config.prometheus_remote_write_url;

  // ── Missing Config Guard ──────────────────────────────────
  if (!prometheusRemoteWriteUrl) {
    print.error('Agent not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox metrics-agent init` first to set the remote endpoints.'
    );
    print.closeError();
    process.exit(1);
  }

  print.success('Configuration loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing observability agent...');
  print.divider();

  const env = {
    ...process.env,
    ALLOY_REMOTE_WRITE_URL: prometheusRemoteWriteUrl,
  };

  const status = runAnsiblePlaybook('metrics-agent.yml', {
    ansibleDir: resolveAnsibleDir(destination),
    filePath,
    projectRoot: resolveProjectRoot(),
    env,
  });

  if (status !== 0) {
    print.blank();
    print.step('Observability agent install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox metrics-agent install');
    print.closeError();
    process.exit(status ?? 1);
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

  print.waiting('Waiting for cAdvisor to be healthy...');

  const cadvisorHealthy = await pollHealth('http://localhost:8080/metrics', {
    retries: 30,
    delayMs: 2000,
  });

  if (nodeExporterHealthy && alloyHealthy && cadvisorHealthy) {
    print.blank();
    print.step('Observability agent installed successfully');
    print.pipe();
    print.success('Node Exporter healthy');
    print.success('Grafana Alloy ready');
    print.success('cAdvisor healthy');
    print.pipe();
    print.pipe('Node Exporter     http://localhost:9100/metrics');
    print.pipe('Alloy UI          http://localhost:12345');
    print.pipe('cAdvisor          http://localhost:8080/metrics');
    print.pipe(`Remote write →    ${prometheusRemoteWriteUrl}`);
    print.pipe();
    print.pipe('To retry: iac-toolbox metrics-agent install');
    print.close();
  } else {
    print.blank();
    print.step('Observability agent install failed');
    print.pipe();
    if (!nodeExporterHealthy) {
      print.error('Node Exporter health check did not pass after 60 seconds');
    }
    if (!alloyHealthy) {
      print.error('Grafana Alloy health check did not pass after 60 seconds');
    }
    if (!cadvisorHealthy) {
      print.error('cAdvisor health check did not pass after 60 seconds');
    }
    print.pipe('Check Ansible output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox metrics-agent install');
    print.closeError();
    process.exit(1);
  }
}
