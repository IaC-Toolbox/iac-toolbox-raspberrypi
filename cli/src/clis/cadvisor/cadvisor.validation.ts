import { print } from '../../design-system/print.js';

export interface CadvisorValidationConfig {
  cadvisor?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateCadvisor(
  _destination: string,
  _filePath: string,
  config: CadvisorValidationConfig
): void {
  if (config.cadvisor?.enabled !== true) {
    print.error('cAdvisor not enabled');
    print.pipe();
    print.pipe(
      'Set cadvisor.enabled: true in iac-toolbox.yml to install cAdvisor.'
    );
    print.closeError();
    process.exit(1);
  }
}
