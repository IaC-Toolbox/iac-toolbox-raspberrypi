import { print } from '../../design-system/print.js';

export interface MetricsAgentValidationConfig {
  grafana_alloy?: {
    alloy_remote_write_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateMetricsAgent(
  _destination: string,
  _filePath: string,
  config: MetricsAgentValidationConfig
): void {
  if (!config.grafana_alloy?.alloy_remote_write_url) {
    print.error('Agent not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox metrics-agent init` first to set the remote endpoints.'
    );
    print.closeError();
    process.exit(1);
  }
}
