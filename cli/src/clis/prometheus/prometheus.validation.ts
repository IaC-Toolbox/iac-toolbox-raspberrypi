import { loadCredentials } from '../../loaders/credentials-loader.js';
import { print } from '../../design-system/print.js';

export function validatePrometheus(
  _destination: string,
  _filePath: string,
  profile: string
): void {
  const creds = loadCredentials(profile);

  if (!creds.grafana_admin_password) {
    print.error('Grafana credentials not found');
    print.pipe();
    print.pipe(
      'Prometheus registers itself as a Grafana datasource during install.'
    );
    print.pipe(
      'Run `iac-toolbox grafana init` first to set up Grafana credentials.'
    );
    print.closeError();
    process.exit(1);
  }
}
