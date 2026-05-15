import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  grafana_alloy?: {
    alloy_remote_write_url?: string;
    [key: string]: unknown;
  };
}

export async function runMetricsAgentInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  const prometheusRemoteWriteUrl = config.grafana_alloy?.alloy_remote_write_url;

  // ── Missing Config Guard ──────────────────────────────────
  if (!prometheusRemoteWriteUrl) {
    unlinkSync(tmpFile);
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

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('metrics-agent.yml', {
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
}
