import { loadThresholdAlertsEnabled } from './threshold-alerts-config.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';

/**
 * Run `iac-toolbox threshold-alerts install`.
 *
 * Reads threshold_alerts.enabled from iac-toolbox.yml, then invokes
 * runAnsiblePlaybook('grafana-threshold-alerts.yml') to render Terraform
 * alert templates to ./infrastructure/terraform/grafana-alerts/.
 *
 * Exits 1 if threshold_alerts.enabled is not set — hint to run init first.
 */
export async function runThresholdAlertsInstall(
  destination: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  const enabled = loadThresholdAlertsEnabled(destination, filePath);

  // ── Missing Config Guard ──────────────────────────────────
  if (enabled === undefined || enabled === null) {
    print.error('Threshold alerts not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox threshold-alerts init` first to enable or disable threshold alerts.'
    );
    print.closeError();
    process.exit(1);
  }

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Copying Grafana alert templates...');
  print.divider();

  const status = runAnsiblePlaybook('grafana-threshold-alerts.yml', {
    ansibleDir: resolveAnsibleDir(destination),
    filePath,
    projectRoot: resolveProjectRoot(),
  });

  if (status !== 0) {
    print.stepFailure('threshold-alerts install', 'threshold-alerts install');
    process.exit(status ?? 1);
  }

  // ── Post-Install Next Steps ───────────────────────────────
  print.blank();
  print.step('Threshold alert templates installed');
  print.pipe();
  print.success(
    'Terraform files rendered to ./infrastructure/terraform/grafana-alerts/'
  );
  print.pipe();
  print.pipe('Next steps:');
  print.pipe();
  print.pipe('   cd ./infrastructure/terraform/grafana-alerts');
  print.pipe('   terraform init');
  print.pipe('   terraform apply');
  print.pipe();
  print.pipe('After apply, visit Grafana → Alerting → Alert rules');
  print.pipe('to confirm rules are visible under the alerts folder.');
  print.pipe();
  print.close();
}
