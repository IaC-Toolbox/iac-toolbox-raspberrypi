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
 * Run `iac-toolbox grafana-pagerduty install`.
 *
 * Reads grafana_pagerduty.enabled from iac-toolbox.yml, resolves credential
 * templates (including pagerduty_token), writes a temp config to
 * ~/.iac-toolbox/, then invokes the grafana-pagerduty.yml playbook.
 *
 * Exits 1 if grafana_pagerduty.enabled is not set — hint to run init first.
 */
export async function runGrafanaPagerdutyInstall(
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
  validateClis('grafana-pagerduty', {
    destination,
    filePath: tmpFile,
    profile,
    config,
  });

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Rendering Grafana-PagerDuty Terraform templates...');
  print.divider();

  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-pagerduty.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.stepFailure(
      'grafana-pagerduty install',
      'iac-toolbox grafana-pagerduty install'
    );
    process.exit(status ?? 1);
  }

  // ── Post-Install Next Steps ───────────────────────────────
  print.blank();
  print.step('Grafana-PagerDuty integration templates installed');
  print.pipe();
  print.success(
    'Terraform files rendered to ./infrastructure/terraform/grafana-pagerduty/'
  );
  print.pipe();
  print.pipe('Next steps:');
  print.pipe();
  print.pipe('   cd ./infrastructure/terraform/grafana-pagerduty');
  print.pipe('   terraform init');
  print.pipe('   terraform apply');
  print.pipe();
  print.pipe('After apply:');
  print.pipe('• PagerDuty → Services → Infrastructure-Monitoring is live');
  print.pipe(
    '• Grafana → Alerting → Contact points → "PagerDuty On-Call" is present'
  );
  print.pipe(
    '• Grafana → Alerting → Notification policies shows severity routing'
  );
  print.pipe();
  print.close();
}
