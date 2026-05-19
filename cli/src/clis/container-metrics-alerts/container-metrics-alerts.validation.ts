import {
  loadContainerMetricsAlertsEnabled,
  loadContainerMetricsAlertsServiceName,
} from './container-metrics-alerts-config.js';
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
}
