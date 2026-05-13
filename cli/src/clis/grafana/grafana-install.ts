import { spawnSync } from 'child_process';
import { loadCredentials } from '../credentials/credentials-store.js';
import { loadIacToolboxYaml } from './grafana-config.js';
import { pollHealth } from '../../utils/healthCheck.js';
import { print } from '../../utils/print.js';

/**
 * Run `iac-toolbox grafana install`.
 *
 * Reads credentials from file (no wizard), invokes install.sh --grafana --local,
 * and performs a post-install health check.
 */
export async function runGrafanaInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  // ── Missing Credentials Guard ─────────────────────────────
  print.step('Reading Grafana credentials...');
  const creds = loadCredentials(profile);
  const config = loadIacToolboxYaml(destination, filePath);

  if (!creds.grafana_admin_password) {
    print.error('No credentials found');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana init` first to set up credentials');
    print.closeError();
    process.exit(1);
  }

  const adminUser =
    (config.grafana?.admin_user as string) ??
    creds.grafana_admin_user ??
    'admin';

  print.success('Credentials loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing Grafana...');
  print.divider();

  const env = {
    ...process.env,
    GRAFANA_ADMIN_USER: adminUser,
    GRAFANA_ADMIN_PASSWORD: creds.grafana_admin_password,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--grafana'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    print.blank();
    print.step('Grafana install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox grafana install');
    print.closeError();
    process.exit(result.status ?? 1);
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

  const healthy = await pollHealth(healthUrl, {
    retries: 30,
    delayMs: 2000,
  });

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
