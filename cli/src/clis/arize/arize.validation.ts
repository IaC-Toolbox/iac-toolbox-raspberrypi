import { print } from '../../design-system/print.js';

export interface ArizeValidationConfig {
  arize_phoenix?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateArize(
  _destination: string,
  _filePath: string,
  config: ArizeValidationConfig
): void {
  if (config.arize_phoenix?.enabled !== true) {
    print.error('Arize Phoenix not enabled');
    print.pipe();
    print.pipe(
      'Set arize_phoenix.enabled: true in iac-toolbox.yml to install Arize Phoenix.'
    );
    print.pipe('Run `iac-toolbox arize init` to configure.');
    print.closeError();
    process.exit(1);
  }
}
