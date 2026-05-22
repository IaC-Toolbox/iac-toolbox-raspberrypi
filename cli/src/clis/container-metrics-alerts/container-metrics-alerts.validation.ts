import { loadContainerMetricsAlertsEnabled } from './container-metrics-alerts-config.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';
import { print } from '../../design-system/print.js';

export function validateContainerMetricsAlerts(
  destination: string,
  filePath?: string
): void {
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

  // service_name is now a top-level canonical field (not under container_metrics_alerts)
  // Check top-level service_name; fall back to container_metrics_alerts.service_name for backward compat
  const topLevel = loadIacToolboxYaml(destination, filePath) as {
    service_name?: string;
    container_metrics_alerts?: { service_name?: string };
  };
  const serviceName =
    topLevel.service_name ?? topLevel.container_metrics_alerts?.service_name;

  if (!serviceName) {
    print.error('service_name not set');
    print.pipe(
      'Add a top-level service_name field to iac-toolbox.yml, or run `iac-toolbox container-metrics-alerts init`.'
    );
    print.pipe(
      'The service name must match the exact container name in cAdvisor metrics.'
    );
    print.closeError();
    process.exit(1);
  }
}
