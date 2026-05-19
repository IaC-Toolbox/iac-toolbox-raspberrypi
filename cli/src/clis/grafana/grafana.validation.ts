import { loadCredentials } from '../../loaders/credentials-loader.js';
import { print } from '../../design-system/print.js';

export function validateGrafana(
  _destination: string,
  _filePath: string,
  profile: string
): void {
  const creds = loadCredentials(profile);

  if (!creds.grafana_admin_password) {
    print.error('No credentials found');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana init` first to set up credentials');
    print.closeError();
    process.exit(1);
  }
}
