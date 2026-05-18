import { unlinkSync } from 'fs';
import { loadNodeMetricsAlertsEnabled } from './node-metrics-alerts-config.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

/**
 * Run `iac-toolbox node-metrics-alerts install`.
 *
 * Reads node_metrics_alerts.enabled from iac-toolbox.yml, resolves credential
 * templates, writes a temp config to ~/.iac-toolbox/, then invokes the
 * grafana-node-metrics-alerts.yml playbook.
 *
 * Exits 1 if node_metrics_alerts.enabled is not set — hint to run init first.
 */
export async function runNodeMetricsAlertsInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  const enabled = loadNodeMetricsAlertsEnabled(destination, filePath);

  if (enabled === undefined || enabled === null) {
    print.error('Node metrics alerts not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox node-metrics-alerts init` first to enable or disable node metrics alerts.'
    );
    print.closeError();
    process.exit(1);
  }

  // ── Resolve templates, absolutify paths, write temp config ──
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Copying Grafana node metrics alert templates...');
  print.divider();
  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-node-metrics-alerts.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.stepFailure(
      'node-metrics-alerts install',
      'node-metrics-alerts install'
    );
    process.exit(status ?? 1);
  }

  // ── Post-Install Next Steps ───────────────────────────────
  print.blank();
  print.step('Node metrics alert templates installed');
  print.pipe();
  print.success('Terraform files rendered to the configured terraform_dest');
  print.pipe();
  print.pipe('Visit Grafana → Alerting → Alert rules');
  print.pipe('to confirm rules are visible under the node alerts folder.');
  print.pipe();
  print.close();
}
