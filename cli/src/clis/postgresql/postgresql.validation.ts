import { print } from '../../design-system/print.js';
import { getCredential } from '../../loaders/credentials-loader.js';

export interface PostgresqlValidationConfig {
  postgresql?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validatePostgresql(
  _destination: string,
  _filePath: string,
  config: PostgresqlValidationConfig,
  profile = 'default'
): void {
  if (config.postgresql?.enabled !== true) {
    print.error('PostgreSQL not enabled');
    print.pipe();
    print.pipe(
      'Set postgresql.enabled: true in iac-toolbox.yml to install PostgreSQL.'
    );
    print.pipe('Run `iac-toolbox postgresql init` to configure.');
    print.closeError();
    process.exit(1);
  }

  const password = getCredential('postgres_password', profile);
  if (!password || password.trim().length === 0) {
    print.error('postgres_password is not set');
    print.pipe();
    print.pipe('Run `iac-toolbox postgresql init` to set the admin password.');
    print.closeError();
    process.exit(1);
  }
}
