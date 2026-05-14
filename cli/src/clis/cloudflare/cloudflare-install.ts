import { loadCredentials } from '../../loaders/credentials-loader.js';
import { pollHealth } from '../../validators/health_check.js';
import { print } from '../../design-system/print.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';

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
 * Reads credentials from file (no wizard), invokes runAnsiblePlaybook('cloudflare.yml'),
 * and performs a post-install health check against the cloudflared metrics endpoint.
 */
export async function runCloudflareInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // -- Read Configuration ------------------------------------------------
  print.step('Reading Cloudflare configuration...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

  // -- Missing Credentials Guard -----------------------------------------
  if (!creds.cloudflare_api_token) {
    print.error('No API token found');
    print.pipe();
    print.pipe('Run `iac-toolbox cloudflare init` first to set up credentials');
    print.closeError();
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
    print.error('Cloudflare configuration incomplete');
    print.pipe();
    print.pipe(`Missing: ${missing.join(', ')}`);
    print.pipe('Run `iac-toolbox cloudflare init` to configure');
    print.closeError();
    process.exit(1);
  }

  print.success('Credentials loaded');
  print.pipe();

  // -- Ansible Invocation ------------------------------------------------
  print.step('Installing Cloudflare Tunnel...');
  print.divider();

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: creds.cloudflare_api_token,
    CLOUDFLARE_ACCOUNT_ID: config.cloudflare!.account_id!,
    CLOUDFLARE_ZONE_ID: config.cloudflare!.zone_id!,
  };

  const status = runAnsiblePlaybook('cloudflare.yml', {
    ansibleDir: resolveAnsibleDir(destination),
    filePath,
    projectRoot: resolveProjectRoot(),
    env,
  });

  if (status !== 0) {
    print.blank();
    print.step('Cloudflare Tunnel install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox cloudflare install');
    print.closeError();
    process.exit(status ?? 1);
  }

  // -- Post-Install Health Check -----------------------------------------
  print.waiting('Waiting for tunnel to be healthy...');

  const healthy = await pollHealth('http://localhost:20241/ready', {
    retries: 15,
    delayMs: 2000,
  });

  const tunnelName = config.cloudflare!.tunnel_name || 'cloudflare-tunnel';
  const firstDomain = config.cloudflare!.domains![0];

  if (healthy) {
    print.blank();
    print.step('Cloudflare Tunnel installed successfully');
    print.pipe();
    print.success('Tunnel is running');
    print.pipe();
    print.pipe(`Tunnel name    ${tunnelName}`);
    print.pipe(
      `Domain         ${firstDomain.hostname} → localhost:${firstDomain.service_port}`
    );
    print.pipe('Dashboard      https://dash.cloudflare.com');
    print.pipe();
    print.pipe('Run `iac-toolbox cloudflare uninstall` to remove');
    print.close();
  } else {
    print.blank();
    print.step('Cloudflare Tunnel install completed');
    print.pipe();
    print.warning(
      'Health check did not pass (cloudflared metrics endpoint not available)'
    );
    print.pipe('The tunnel may still be running — check Ansible output above');
    print.pipe();
    print.pipe(`Tunnel name    ${tunnelName}`);
    print.pipe(
      `Domain         ${firstDomain.hostname} → localhost:${firstDomain.service_port}`
    );
    print.pipe('Dashboard      https://dash.cloudflare.com');
    print.pipe();
    print.pipe('Run `iac-toolbox cloudflare uninstall` to remove');
    print.closeError();
  }
}
