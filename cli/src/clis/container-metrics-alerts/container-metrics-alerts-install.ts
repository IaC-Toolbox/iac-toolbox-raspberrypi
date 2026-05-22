import { unlinkSync } from 'fs';
import { loadContainerMetricsAlertsServiceName } from './container-metrics-alerts-config.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import yaml from 'js-yaml';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis, CliName } from '../validate-clis.js';

/**
 * Run `iac-toolbox container-metrics-alerts install`.
 *
 * Reads container_metrics_alerts.enabled from iac-toolbox.yml, resolves
 * credential templates, writes a temp config to ~/.iac-toolbox/, then invokes
 * the grafana-container-metrics-alerts.yml playbook.
 *
 * service_name is now a top-level field derived by Ansible — the nested
 * container_metrics_alerts.service_name is kept for backward compatibility.
 *
 * Exits 1 if container_metrics_alerts.enabled is not set — hint to run init first.
 */
export async function runContainerMetricsAlertsInstall(
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
  validateClis(CliName.ContainerMetricsAlerts, {
    destination,
    filePath: tmpFile,
    profile,
    config,
  });

  // Prefer top-level service_name; fall back to nested key for backward compat
  const topLevel = loadIacToolboxYaml(destination, filePath) as {
    service_name?: string;
  };
  const serviceName =
    topLevel.service_name ??
    loadContainerMetricsAlertsServiceName(destination, filePath) ??
    'unknown';

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
