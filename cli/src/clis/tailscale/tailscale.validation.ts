import { print } from '../../design-system/print.js';
import { getCredential } from '../../loaders/credentials-loader.js';

export interface TailscaleValidationConfig {
  tailscale?: {
    enabled?: boolean;
    hostname?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateTailscale(
  _destination: string,
  _filePath: string,
  config: TailscaleValidationConfig,
  profile = 'default'
): void {
  if (config.tailscale?.enabled !== true) {
    print.error('Tailscale not enabled');
    print.pipe();
    print.pipe(
      'Set tailscale.enabled: true in iac-toolbox.yml to install Tailscale.'
    );
    print.pipe('Run `iac-toolbox tailscale init` to configure.');
    print.closeError();
    process.exit(1);
  }

  const authKey = getCredential('tailscale_auth_key', profile);
  if (!authKey || authKey.trim().length === 0) {
    print.error('Tailscale auth key not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox tailscale init` to configure your Tailscale auth key.'
    );
    print.pipe(
      'Generate an auth key at: https://login.tailscale.com/admin/settings/keys'
    );
    print.closeError();
    process.exit(1);
  }
}
