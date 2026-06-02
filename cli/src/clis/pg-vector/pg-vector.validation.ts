import { print } from '../../design-system/print.js';
import { getCredential } from '../../loaders/credentials-loader.js';

export interface PgVectorValidationConfig {
  pg_vector?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validatePgVector(
  _destination: string,
  _filePath: string,
  config: PgVectorValidationConfig,
  profile = 'default'
): void {
  if (config.pg_vector?.enabled !== true) {
    print.error('pgvector not enabled');
    print.pipe();
    print.pipe(
      'Set pg_vector.enabled: true in iac-toolbox.yml to install pgvector.'
    );
    print.pipe('Run `iac-toolbox pg-vector init` to configure.');
    print.closeError();
    process.exit(1);
  }

  const password = getCredential('pgvector_password', profile);
  if (!password || password.trim().length === 0) {
    print.error('pgvector_password is not set');
    print.pipe();
    print.pipe('Run `iac-toolbox pg-vector init` to set the admin password.');
    print.closeError();
    process.exit(1);
  }
}
