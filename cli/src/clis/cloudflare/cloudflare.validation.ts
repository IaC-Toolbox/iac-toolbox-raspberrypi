import { loadCredentials } from '../../loaders/credentials-loader.js';
import { print } from '../../design-system/print.js';

export interface CloudflareValidationConfig {
  cloudflare?: {
    enabled?: boolean;
    account_id?: string;
    zone_id?: string;
    domains?: Array<{
      hostname: string;
      service_port: number;
      service: string;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateCloudflare(
  _destination: string,
  _filePath: string,
  profile: string,
  config: CloudflareValidationConfig
): void {
  const creds = loadCredentials(profile);

  if (!creds.cloudflare_api_token) {
    print.error('No API token found');
    print.pipe();
    print.pipe('Run `iac-toolbox cloudflare init` first to set up credentials');
    print.closeError();
    process.exit(1);
  }

  const missing: string[] = [];
  if (!config.cloudflare?.account_id) missing.push('account_id');
  if (!config.cloudflare?.zone_id) missing.push('zone_id');
  if (!config.cloudflare?.domains || config.cloudflare.domains.length === 0) {
    missing.push('domains');
  }

  if (missing.length > 0) {
    print.error('Cloudflare configuration incomplete');
    print.pipe();
    print.pipe(`Missing: ${missing.join(', ')}`);
    print.pipe('Run `iac-toolbox cloudflare init` to configure');
    print.closeError();
    process.exit(1);
  }
}
