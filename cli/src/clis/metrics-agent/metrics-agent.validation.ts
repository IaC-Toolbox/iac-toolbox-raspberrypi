import { print } from '../../design-system/print.js';

export interface MetricsAgentValidationConfig {
  grafana_alloy?: {
    alloy_remote_write_url?: string;
    enabled?: boolean;
    [key: string]: unknown;
  };
  prometheus?: {
    domain?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateMetricsAgent(
  _destination: string,
  _filePath: string,
  config: MetricsAgentValidationConfig
): void {
  // grafana_alloy.enabled must be set (written by metrics-agent init)
  // alloy_remote_write_url is no longer required — it is derived by Ansible from prometheus.domain
  if (!config.grafana_alloy?.enabled) {
    print.error('Agent not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox metrics-agent init` first to enable the metrics agent.'
    );
    print.closeError();
    process.exit(1);
  }
}
