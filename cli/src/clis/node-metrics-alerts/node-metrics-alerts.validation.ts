import { loadNodeMetricsAlertsEnabled } from './node-metrics-alerts-config.js';
import { print } from '../../design-system/print.js';

export function validateNodeMetricsAlerts(
  destination: string,
  filePath?: string
): void {
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
}
