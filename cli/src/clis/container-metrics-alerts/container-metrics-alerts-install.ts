import { unlinkSync } from 'fs';
import {
  loadContainerMetricsAlertsEnabled,
  loadContainerMetricsAlertsServiceName,
} from './container-metrics-alerts-config.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

/**
 * Run `iac-toolbox container-metrics-alerts install`.
 *
 * Reads container_metrics_alerts.enabled and container_metrics_alerts.service_name
 * from iac-toolbox.yml, resolves credential templates, writes a temp config to
 * ~/.iac-toolbox/, then invokes the grafana-container-metrics-alerts.yml playbook.
 *
 * Exits 1 if container_metrics_alerts.enabled is not set — hint to run init first.
 * Exits 1 if container_metrics_alerts.service_name is not set — required for scoping alerts.
 */
export async function runContainerMetricsAlertsInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // ── Read Configuration ────────────────────────────────────
  const enabled = loadContainerMetricsAlertsEnabled(destination, filePath);

  if (enabled === undefined || enabled === null) {
    print.error('Container metrics alerts not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox container-metrics-alerts init` first to enable or disable container metrics alerts.'
    );
    print.closeError();
    process.exit(1);
  }

  const serviceName = loadContainerMetricsAlertsServiceName(
    destination,
    filePath
  );
  if (!serviceName) {
    print.error('container_metrics_alerts.service_name not set');
    print.pipe(
      'Run `iac-toolbox container-metrics-alerts init` to configure the service name.'
    );
    print.pipe(
      'The service name must match the exact container name in cAdvisor metrics.'
    );
    print.closeError();
    process.exit(1);
  }

  // ── Resolve templates, absolutify paths, write temp config ──
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Copying Grafana container metrics alert templates...');
  print.divider();
  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-container-metrics-alerts.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.stepFailure(
      'container-metrics-alerts install',
      'container-metrics-alerts install'
    );
    process.exit(status ?? 1);
  }

  // ── Post-Install Next Steps ───────────────────────────────
  print.blank();
  print.step('Container metrics alert templates installed');
  print.pipe();
  print.success('Terraform files rendered to the configured terraform_dest');
  print.pipe('Visit Grafana → Alerting → Alert rules');
  print.pipe(`to confirm rules are visible under the "${serviceName}" folder.`);
  print.pipe();
  print.close();
}
