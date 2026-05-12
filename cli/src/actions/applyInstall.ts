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
import { runMetricsAgentInstall } from './metricsAgentInstall.js';
import { runPrometheusInstall } from './prometheusInstall.js';
import { runGrafanaInstall } from './grafanaInstall.js';
import { runCloudflareInstall } from './cloudflareInstall.js';

/** Run a single install step. Returns false if the step throws. */
async function runStep(fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

/** Print the failure block when an install step exits non-zero. */
function printStepFailure(stepName: string, command: string): void {
  console.error('│');
  console.error(`│  ✗ Install failed at: ${stepName}`);
  console.error('│  Check Ansible output above for details.');
  console.error('│');
  console.error('│  To retry from this step:');
  console.error(`│     iac-toolbox ${command}`);
  console.error('│');
  console.error('│  To retry the full apply:');
  console.error('│     iac-toolbox apply --filePath=./iac-toolbox.yml');
  console.error('└');
}

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
    console.error(`│  ✗ Config not found: ${filePath}`);
    console.error('│');
    console.error(
      '│  Run `iac-toolbox init` first to generate iac-toolbox.yml'
    );
    console.error('└');
    process.exit(1);
  }
  console.log(`│  ✔ Config loaded: ${filePath}`);

  if (!grafanaAdminPassword) {
    console.error('│  ✗ Credentials missing: grafana_admin_password not found');
    console.error('│');
    console.error(
      '│  Run `iac-toolbox grafana init` first to set up credentials.'
    );
    console.error('└');
    process.exit(1);
  }
  console.log('│  ✔ Credentials loaded from ~/.iac-toolbox/credentials');

  const targetMode = config.target?.mode ?? 'local';
  const targetHost = (config.target?.host as string | undefined) ?? 'localhost';
  const targetUser = config.target?.user ?? 'pi';
  const targetSshKey =
    (config.target?.ssh_key as string | undefined) ?? '~/.ssh/id_ed25519';

  if (targetMode === 'remote') {
    process.stdout.write(
      `│  ◜ Testing SSH connection to ${targetUser}@${targetHost}...\n`
    );
    const sshOk = await testSshConnection(targetHost, targetUser, targetSshKey);
    if (!sshOk) {
      console.error(
        `│  ✗ SSH connection failed to ${targetUser}@${targetHost}`
      );
      console.error('│');
      console.error(
        '│  Ensure the host is reachable and the SSH key is correct.'
      );
      console.error('│  Fix connectivity, then re-run apply.');
      console.error('└');
      process.exit(1);
    }
    console.log('│  ✔ SSH connection successful');
  }

  const dockerOk = checkDockerAvailable(
    targetMode,
    targetHost,
    targetUser,
    targetSshKey
  );
  if (!dockerOk) {
    console.error('│  ✗ Docker not available on target');
    console.error('│');
    console.error('│  Ensure Docker is installed and running on the target.');
    console.error('└');
    process.exit(1);
  }
  console.log('│  ✔ Docker available on target');
  console.log('└');

  return { targetMode, targetHost };
}

/**
 * Run the install sequence and return whether Cloudflare was installed.
 * Calls process.exit(1) with a retry hint on the first failure.
 */
async function runInstallSequence(
  destination: string,
  profile: string,
  filePath: string,
  config: ApplySummaryConfig
): Promise<boolean> {
  const metricsOk = await runStep(() =>
    runMetricsAgentInstall(destination, filePath)
  );
  if (!metricsOk) {
    printStepFailure(
      'metrics-agent',
      'metrics-agent install --filePath=./iac-toolbox.yml'
    );
    process.exit(1);
  }

  const prometheusOk = await runStep(() =>
    runPrometheusInstall(destination, profile, filePath)
  );
  if (!prometheusOk) {
    printStepFailure(
      'prometheus',
      'prometheus install --filePath=./iac-toolbox.yml'
    );
    process.exit(1);
  }

  if (config.cadvisor?.enabled !== false) {
    const { runCAdvisorInstall } = await import('./cadvisorInstall.js');
    const cadvisorOk = await runStep(() =>
      runCAdvisorInstall(destination, profile, filePath)
    );
    if (!cadvisorOk) {
      printStepFailure(
        'cadvisor',
        'cadvisor install --filePath=./iac-toolbox.yml'
      );
      process.exit(1);
    }
  }

  const grafanaOk = await runStep(() =>
    runGrafanaInstall(destination, profile, filePath)
  );
  if (!grafanaOk) {
    printStepFailure('grafana', 'grafana install --filePath=./iac-toolbox.yml');
    process.exit(1);
  }

  const cloudflareEnabled =
    config.cloudflare &&
    (config.cloudflare as { enabled?: boolean }).enabled === true;

  if (cloudflareEnabled) {
    const cloudflareOk = await runStep(() =>
      runCloudflareInstall(destination, profile, filePath)
    );
    if (!cloudflareOk) {
      printStepFailure(
        'cloudflare',
        'cloudflare install --filePath=./iac-toolbox.yml'
      );
      process.exit(1);
    }
  }

  return Boolean(cloudflareEnabled);
}

/**
 * Run `iac-toolbox apply`.
 *
 * Orchestrates:
 *   1. Pre-flight checks (config, credentials, SSH, Docker)
 *   2. Install sequence: metrics-agent → prometheus → cadvisor → grafana → cloudflare
 *   3. Post-install summary
 */
export async function runApplyInstall(
  destination: string,
  profile: string,
  filePath: string
): Promise<void> {
  console.log('◆  Pre-flight checks');

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

  const cloudflareEnabled = await runInstallSequence(
    destination,
    profile,
    filePath,
    config
  );

  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
