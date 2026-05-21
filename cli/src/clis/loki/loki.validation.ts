import { print } from '../../design-system/print.js';

export interface LokiValidationConfig {
  loki?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateLoki(
  _destination: string,
  _filePath: string,
  config: LokiValidationConfig
): void {
  if (config.loki?.enabled !== true) {
    print.error('Loki not enabled');
    print.pipe();
    print.pipe('Set loki.enabled: true in iac-toolbox.yml to install Loki.');
    print.closeError();
    process.exit(1);
  }
}
