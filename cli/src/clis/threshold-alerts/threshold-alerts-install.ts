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
 * Run `iac-toolbox threshold-alerts install`.
 *
 * Reads threshold_alerts.enabled from iac-toolbox.yml, resolves credential
 * templates, converts relative paths to absolute, writes a temp config to
 * ~/.iac-toolbox/, then invokes the grafana-threshold-alerts.yml playbook.
 *
 * Exits 1 if threshold_alerts.enabled is not set — hint to run init first.
 */
export async function runThresholdAlertsInstall(
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
  validateClis('threshold-alerts', {
    destination,
    filePath: tmpFile,
    profile,
    config,
  });

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Copying Grafana alert templates...');
  print.divider();
  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-threshold-alerts.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
    });
  } finally {
    unlinkSync(tmpFile);
  }

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
