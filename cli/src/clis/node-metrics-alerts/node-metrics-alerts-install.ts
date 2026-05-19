import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import yaml from 'js-yaml';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis } from '../validate-clis.js';

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
  // ── Resolve templates, absolutify paths, write temp config ──
  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as Record<string, unknown>;

  // ── Read Configuration ────────────────────────────────────
  validateClis('node-metrics-alerts', {
    destination,
    filePath: tmpFile,
    profile,
    config,
  });

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
