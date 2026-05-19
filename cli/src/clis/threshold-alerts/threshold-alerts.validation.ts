import {
  loadThresholdAlertsEnabled,
  loadThresholdAlertsServiceName,
} from './threshold-alerts-config.js';
import { print } from '../../design-system/print.js';

export function validateThresholdAlerts(
  destination: string,
  filePath?: string
): void {
  const enabled = loadThresholdAlertsEnabled(destination, filePath);

  if (enabled === undefined || enabled === null) {
    print.error('Threshold alerts not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox threshold-alerts init` first to enable or disable threshold alerts.'
    );
    print.closeError();
    process.exit(1);
  }

  const serviceName = loadThresholdAlertsServiceName(destination, filePath);
  if (!serviceName) {
    print.error('threshold_alerts.service_name not set');
    print.pipe(
      'Run `iac-toolbox threshold-alerts init` to configure the service name.'
    );
    print.closeError();
    process.exit(1);
  }
}
