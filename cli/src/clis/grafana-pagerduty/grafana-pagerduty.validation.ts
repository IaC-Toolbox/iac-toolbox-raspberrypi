import { loadGrafanaPagerdutyConfig } from './grafana-pagerduty-config.js';
import { print } from '../../design-system/print.js';

export function validateGrafanaPagerduty(
  destination: string,
  filePath?: string
): void {
  const config = loadGrafanaPagerdutyConfig(destination, filePath);

  if (!config?.enabled) {
    print.error('Grafana-PagerDuty integration not configured');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana-pagerduty init` first.');
    print.closeError();
    process.exit(1);
  }
}
