import { spawnSync } from 'child_process';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { loadCredentials } from '../utils/credentials.js';
import {
  testSshConnection,
  checkDockerAvailable,
} from '../utils/preflightChecks.js';
import {
  printSummaryNoCloudflare,
  printSummaryWithCloudflare,
  type ApplySummaryConfig,
} from '../utils/applySummary.js';
import { print } from '../utils/print.js';

/**
 * Validate config, credentials, SSH (remote only), and Docker.
 * Returns target connection info. Calls process.exit(1) on any failure.
 */
async function runPreflightChecks(
  config: ApplySummaryConfig,
  filePath: string,
  grafanaAdminPassword: string | undefined
): Promise<{ targetMode: string; targetHost: string }> {
  const configIsEmpty =
    !config || (typeof config === 'object' && Object.keys(config).length === 0);
  if (configIsEmpty) {
    print.error(`Config not found: ${filePath}`);
    print.pipe();
    print.pipe('Run `iac-toolbox init` first to generate iac-toolbox.yml');
    print.closeError();
    process.exit(1);
  }
  print.success(`Config loaded: ${filePath}`);

  if (!grafanaAdminPassword) {
    print.error('Credentials missing: grafana_admin_password not found');
    print.pipe();
    print.pipe('Run `iac-toolbox grafana init` first to set up credentials.');
    print.closeError();
    process.exit(1);
  }
  print.success('Credentials loaded from ~/.iac-toolbox/credentials');

  const targetMode = config.target?.mode ?? 'local';
  const targetHost = (config.target?.host as string | undefined) ?? 'localhost';
  const targetUser = config.target?.user ?? 'pi';
  const targetSshKey =
    (config.target?.ssh_key as string | undefined) ?? '~/.ssh/id_ed25519';

  if (targetMode === 'remote') {
    print.waiting(`Testing SSH connection to ${targetUser}@${targetHost}...`);
    const sshOk = await testSshConnection(targetHost, targetUser, targetSshKey);
    if (!sshOk) {
      print.error(`SSH connection failed to ${targetUser}@${targetHost}`);
      print.pipe();
      print.pipe('Ensure the host is reachable and the SSH key is correct.');
      print.pipe('Fix connectivity, then re-run apply.');
      print.closeError();
      process.exit(1);
    }
    print.success('SSH connection successful');
  }

  const dockerOk = checkDockerAvailable(
    targetMode,
    targetHost,
    targetUser,
    targetSshKey
  );
  if (!dockerOk) {
    print.error('Docker not available on target');
    print.pipe();
    print.pipe('Ensure Docker is installed and running on the target.');
    print.closeError();
    process.exit(1);
  }
  print.success('Docker available on target');
  print.close();

  return { targetMode, targetHost };
}

/**
 * Run the full observability stack via a single `observability_platform.yml`
 * Ansible run. Returns whether Cloudflare was enabled in the config.
 */
function runInstallSequence(
  destination: string,
  filePath: string,
  config: ApplySummaryConfig,
  creds: ReturnType<typeof loadCredentials>
): boolean {
  const scriptPath = `${destination}/scripts/install.sh`;

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (creds.grafana_admin_user)
    env.GRAFANA_ADMIN_USER = creds.grafana_admin_user;
  if (creds.grafana_admin_password)
    env.GRAFANA_ADMIN_PASSWORD = creds.grafana_admin_password;
  if (creds.cloudflare_api_token)
    env.CLOUDFLARE_API_TOKEN = creds.cloudflare_api_token;

  const alloyUrl = (
    config as Record<string, unknown> & {
      grafana_alloy?: { alloy_remote_write_url?: string };
    }
  ).grafana_alloy?.alloy_remote_write_url;
  if (alloyUrl) env.ALLOY_REMOTE_WRITE_URL = alloyUrl;

  const result = spawnSync(
    'bash',
    [scriptPath, '--observability-platform', '--filePath', filePath],
    { env, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    print.blank();
    print.step('Observability stack install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox apply --filePath=./iac-toolbox.yml');
    print.closeError();
    process.exit(result.status ?? 1);
  }

  return Boolean(
    config.cloudflare &&
      (config.cloudflare as { enabled?: boolean }).enabled === true
  );
}

/**
 * Run `iac-toolbox apply`.
 *
 * Orchestrates:
 *   1. Pre-flight checks (config, credentials, SSH, Docker)
 *   2. Single Ansible run via observability_platform.yml
 *   3. Post-install summary
 */
export async function runApplyInstall(
  destination: string,
  profile: string,
  filePath: string
): Promise<void> {
  print.step('Pre-flight checks');

  const config = loadIacToolboxYaml(
    destination,
    filePath
  ) as ApplySummaryConfig;
  const creds = loadCredentials(profile);

  const { targetMode, targetHost } = await runPreflightChecks(
    config,
    filePath,
    creds.grafana_admin_password
  );

  const cloudflareEnabled = runInstallSequence(
    destination,
    filePath,
    config,
    creds
  );

  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
