import { spawnSync } from 'child_process';
import os from 'os';
import { loadCredentials } from '../utils/credentials.js';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollHealth } from '../utils/healthCheck.js';

interface CloudflareConfig {
  enabled?: boolean;
  account_id?: string;
  zone_id?: string;
  tunnel_name?: string;
  domains?: Array<{
    hostname: string;
    service_port: number;
    service: string;
  }>;
  [key: string]: unknown;
}

interface IacToolboxConfig {
  [key: string]: unknown;
  cloudflare?: CloudflareConfig;
}

/**
 * Run `iac-toolbox cloudflare install`.
 *
 * Reads credentials from file (no wizard), invokes install.sh --cloudflared --local,
 * and performs a post-install health check against the cloudflared metrics endpoint.
 */
export async function runCloudflareInstall(
  destination: string,
  profile: string
): Promise<void> {
  // -- Read Configuration ------------------------------------------------
  console.log('◆  Reading Cloudflare configuration...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination) as IacToolboxConfig;

  // -- Missing Credentials Guard -----------------------------------------
  if (!creds.cloudflare_api_token) {
    console.error('│  ✗ No API token found');
    console.error('│');
    console.error(
      '│  Run `iac-toolbox cloudflare init` first to set up credentials'
    );
    console.error('└');
    process.exit(1);
  }

  // -- Incomplete Config Guard -------------------------------------------
  const missing: string[] = [];
  if (!config.cloudflare?.account_id) missing.push('account_id');
  if (!config.cloudflare?.zone_id) missing.push('zone_id');
  if (!config.cloudflare?.domains || config.cloudflare.domains.length === 0) {
    missing.push('domains');
  }

  if (missing.length > 0) {
    console.error('│  ✗ Cloudflare configuration incomplete');
    console.error('│');
    console.error(`│  Missing: ${missing.join(', ')}`);
    console.error('│  Run `iac-toolbox cloudflare init` to configure');
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Credentials loaded');
  console.log('│');

  // -- Ansible Invocation ------------------------------------------------
  console.log('◆  Installing Cloudflare Tunnel...');
  console.log('│  ══════════════════════════════════════');

  const env = {
    ...process.env,
    RPI_HOST: 'localhost',
    RPI_USER: os.userInfo().username,
    CLOUDFLARE_API_TOKEN: creds.cloudflare_api_token,
    CLOUDFLARE_ACCOUNT_ID: config.cloudflare!.account_id!,
    CLOUDFLARE_ZONE_ID: config.cloudflare!.zone_id!,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const result = spawnSync('bash', [scriptPath, '--cloudflared', '--local'], {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('');
    console.error('◆  Cloudflare Tunnel install failed');
    console.error('│');
    console.error('│  ✗ Ansible playbook exited with errors');
    console.error('│  Check output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox cloudflare install');
    console.error('└');
    process.exit(result.status ?? 1);
  }

  // -- Post-Install Health Check -----------------------------------------
  console.log('│  ◜ Waiting for tunnel to be healthy...');

  const healthy = await pollHealth('http://localhost:20241/ready', {
    retries: 15,
    delayMs: 2000,
  });

  const tunnelName = config.cloudflare!.tunnel_name || 'cloudflare-tunnel';
  const firstDomain = config.cloudflare!.domains![0];

  if (healthy) {
    console.log('');
    console.log('◆  Cloudflare Tunnel installed successfully');
    console.log('│');
    console.log('│  ✔ Tunnel is running');
    console.log('│');
    console.log(`│  Tunnel name    ${tunnelName}`);
    console.log(
      `│  Domain         ${firstDomain.hostname} → localhost:${firstDomain.service_port}`
    );
    console.log('│  Dashboard      https://dash.cloudflare.com');
    console.log('│');
    console.log('│  Run `iac-toolbox cloudflare uninstall` to remove');
    console.log('└');
  } else {
    console.error('');
    console.error('◆  Cloudflare Tunnel install completed');
    console.error('│');
    console.error(
      '│  ⚠ Health check did not pass (cloudflared metrics endpoint not available)'
    );
    console.error(
      '│  The tunnel may still be running — check Ansible output above'
    );
    console.error('│');
    console.error(`│  Tunnel name    ${tunnelName}`);
    console.error(
      `│  Domain         ${firstDomain.hostname} → localhost:${firstDomain.service_port}`
    );
    console.error('│  Dashboard      https://dash.cloudflare.com');
    console.error('│');
    console.error('│  Run `iac-toolbox cloudflare uninstall` to remove');
    console.error('└');
  }
}
