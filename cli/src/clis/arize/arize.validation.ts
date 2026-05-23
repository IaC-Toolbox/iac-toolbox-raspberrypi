import { print } from '../../design-system/print.js';

export interface ArizeValidationConfig {
  arize_phoenix?: {
    enabled?: boolean;
    secret?: string;
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

  const secret = config.arize_phoenix?.secret;
  if (
    !secret ||
    secret.trim().length === 0 ||
    secret === '{{ arize_phoenix_secret }}'
  ) {
    print.error('PHOENIX_SECRET is not set');
    print.pipe();
    print.pipe('Run `iac-toolbox arize init` to set the secret.');
    print.closeError();
    process.exit(1);
  }
}
