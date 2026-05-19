import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { pollHealth } from '../../validators/health_check.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis } from '../validate-clis.js';

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

export async function runCloudflareInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  let status: number;
  try {
    // ── Credentials + Config Guard ────────────────────────────
    validateClis('cloudflare', {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Credentials loaded');
    print.pipe();

    // ── Ansible Invocation ────────────────────────────────────
    print.step('Installing Cloudflare Tunnel...');
    print.divider();

    const env: NodeJS.ProcessEnv = { ...process.env };

    status = runAnsiblePlaybook('cloudflare.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env,
    });
  } finally {
    unlinkSync(tmpFile);
  }

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

  // ── Post-Install Health Check ─────────────────────────────
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
