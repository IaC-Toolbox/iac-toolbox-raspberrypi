import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { loadCredentials } from '../../loaders/credentials-loader.js';
import { pollHealth } from '../../validators/health_check.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  grafana?: {
    admin_user?: string;
    port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  cloudflare?: { enabled?: boolean; [key: string]: unknown };
}

export async function runGrafanaInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const creds = loadCredentials(profile);

  // ── Missing Credentials Guard ─────────────────────────────
  if (!creds.grafana_admin_password) {
    print.error('No credentials found');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana init` first to set up credentials');
    print.closeError();
    process.exit(1);
  }

  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  const adminUser =
    (config.grafana?.admin_user as string) ??
    creds.grafana_admin_user ??
    'admin';

  print.success('Credentials loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing Grafana...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('grafana.yml', {
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
    print.step('Grafana install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox grafana install');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Post-Install Health Check ─────────────────────────────
  const grafanaPort = (config.grafana?.port as number | undefined) ?? 3000;
  const grafanaDomain = config.grafana?.domain as string | undefined;
  const cloudflareEnabled =
    config.cloudflare && (config.cloudflare as Record<string, unknown>).enabled;
  const healthUrl =
    cloudflareEnabled && grafanaDomain
      ? `https://${grafanaDomain}/api/health`
      : `http://localhost:${grafanaPort}/api/health`;

  print.waiting('Waiting for Grafana to be healthy...');

  const healthy = await pollHealth(healthUrl, { retries: 30, delayMs: 2000 });

  if (healthy) {
    print.blank();
    print.step('Grafana installed successfully');
    print.pipe();
    print.success('Health check passed');
    print.pipe();
    if (cloudflareEnabled && grafanaDomain) {
      print.pipe(`Public URL   https://${grafanaDomain}`);
    } else {
      print.pipe(`Local URL    http://localhost:${grafanaPort}`);
    }
    print.pipe(`Username     ${adminUser}`);
    print.pipe('Password     saved to ~/.iac-toolbox/credentials');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana uninstall` to remove');
    print.close();
  } else {
    print.blank();
    print.step('Grafana install failed');
    print.pipe();
    print.error('Health check did not pass after 60 seconds');
    print.pipe('Check Ansible output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox grafana install');
    print.closeError();
    process.exit(1);
  }
}
