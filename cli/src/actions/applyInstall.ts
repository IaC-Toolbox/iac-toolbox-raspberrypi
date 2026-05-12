import { spawnSync } from 'child_process';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { loadCredentials } from '../utils/credentials.js';
import { runMetricsAgentInstall } from './metricsAgentInstall.js';
import { runPrometheusInstall } from './prometheusInstall.js';
import { runGrafanaInstall } from './grafanaInstall.js';
import { runCloudflareInstall } from './cloudflareInstall.js';

interface TargetConfig {
  mode?: string;
  host?: string;
  user?: string;
  ssh_key?: string;
}

interface CloudflareConfig {
  enabled?: boolean;
  domains?: Array<{
    hostname: string;
    service_port: number;
    service: string;
  }>;
  [key: string]: unknown;
}

interface IacToolboxApplyConfig {
  [key: string]: unknown;
  target?: TargetConfig;
  grafana?: {
    port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  prometheus?: {
    port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  cadvisor?: {
    enabled?: boolean;
    port?: number;
    [key: string]: unknown;
  };
  cloudflare?: CloudflareConfig;
}

/**
 * Test SSH connectivity to a remote host.
 * Returns true if the connection succeeds.
 */
async function testSshConnection(
  host: string,
  user: string,
  sshKey: string
): Promise<boolean> {
  const result = spawnSync(
    'ssh',
    [
      '-i',
      sshKey,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      `${user}@${host}`,
      'echo ok',
    ],
    { encoding: 'utf-8' }
  );
  return result.status === 0;
}

/**
 * Check whether Docker is available on the target.
 *
 * For remote targets, runs `docker info` over SSH.
 * For localhost, runs `docker info` directly.
 */
function checkDockerAvailable(
  mode: string,
  host?: string,
  user?: string,
  sshKey?: string
): boolean {
  if (mode === 'remote' && host && user && sshKey) {
    const result = spawnSync(
      'ssh',
      [
        '-i',
        sshKey,
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        '-o',
        'ConnectTimeout=10',
        '-o',
        'BatchMode=yes',
        `${user}@${host}`,
        'docker info > /dev/null 2>&1',
      ],
      { encoding: 'utf-8' }
    );
    return result.status === 0;
  }

  // local mode
  const result = spawnSync('docker', ['info'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  return result.status === 0;
}

/**
 * Run a single install step and handle failure output.
 * Returns false if the step fails (process.exit is NOT called here so callers
 * can print the retry hint before exiting).
 */
async function runStep(fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Print the failure block when an install step exits non-zero.
 */
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
 * Print post-install summary when Cloudflare is disabled.
 */
function printSummaryNoCloudflare(
  config: IacToolboxApplyConfig,
  host: string
): void {
  const grafanaPort = config.grafana?.port ?? 3000;
  const prometheusPort = config.prometheus?.port ?? 9090;
  const cadvisorPort = (config.cadvisor?.port as number | undefined) ?? 8080;

  console.log('');
  console.log('◆  Observability stack installed');
  console.log('│');
  console.log('│  ✔ Node Exporter  running  (:9100)');
  console.log('│  ✔ Grafana Alloy  running  (:12345)');
  console.log(`│  ✔ Prometheus     running  (:${prometheusPort})`);
  console.log(`│  ✔ cAdvisor       running  (:${cadvisorPort})`);
  console.log(`│  ✔ Grafana        running  (:${grafanaPort})`);
  console.log('│');
  console.log('│  Services available at:');
  console.log(
    `│    Node Exporter    http://${host}:9100     (host metrics endpoint)`
  );
  console.log(
    `│    Grafana Alloy    http://${host}:12345    (pipeline graph UI)`
  );
  console.log(`│    Prometheus       http://${host}:${prometheusPort}`);
  console.log(`│    cAdvisor         http://${host}:${cadvisorPort}`);
  console.log(`│    Grafana          http://${host}:${grafanaPort}`);
  console.log('│');

  const isRemote = config.target?.mode === 'remote';
  if (isRemote) {
    console.log('│  SSH tunnel shortcut (access from your laptop):');
    console.log(`│    ssh -L ${grafanaPort}:localhost:${grafanaPort} \\`);
    console.log(`│        -L ${prometheusPort}:localhost:${prometheusPort} \\`);
    console.log('│        -L 12345:localhost:12345 \\');
    console.log(`│        ${config.target?.user ?? 'pi'}@${host}`);
    console.log('│');
  }

  console.log('│  Login: admin / <password in ~/.iac-toolbox/credentials>');
  console.log('│');
  console.log('│  Suggested dashboards (Grafana → Dashboards → Import):');
  console.log('│    Node Exporter Full        ID 1860');
  console.log('│    Docker Container Metrics  ID 193');
  console.log('└');
}

/**
 * Print post-install summary when Cloudflare is enabled.
 */
function printSummaryWithCloudflare(
  config: IacToolboxApplyConfig,
  host: string
): void {
  const grafanaPort = config.grafana?.port ?? 3000;
  const prometheusPort = config.prometheus?.port ?? 9090;
  const cadvisorPort = (config.cadvisor?.port as number | undefined) ?? 8080;
  const grafanaDomain = config.grafana?.domain as string | undefined;
  const prometheusDomain = config.prometheus?.domain as string | undefined;
  const domains = config.cloudflare?.domains ?? [];

  console.log('');
  console.log('◆  Observability stack installed');
  console.log('│');
  console.log('│  ✔ Node Exporter       running  (:9100)');
  console.log('│  ✔ Grafana Alloy       running  (:12345)');
  console.log(`│  ✔ Prometheus          running  (:${prometheusPort})`);
  console.log(`│  ✔ cAdvisor            running  (:${cadvisorPort})`);
  console.log(`│  ✔ Grafana             running  (:${grafanaPort})`);
  console.log('│  ✔ Cloudflare Tunnel   active');
  for (const d of domains) {
    console.log(`│       ${d.hostname}    → :${d.service_port}`);
  }
  console.log('│');
  console.log('│  Services available at:');
  console.log(`│    Node Exporter    http://${host}:9100     (LAN only)`);
  console.log(`│    Grafana Alloy    http://${host}:12345    (LAN only)`);
  if (prometheusDomain) {
    console.log(`│    Prometheus       https://${prometheusDomain}`);
  } else {
    console.log(`│    Prometheus       http://${host}:${prometheusPort}`);
  }
  console.log(
    `│    cAdvisor         http://${host}:${cadvisorPort}     (LAN only)`
  );
  if (grafanaDomain) {
    console.log(`│    Grafana          https://${grafanaDomain}`);
  } else {
    console.log(`│    Grafana          http://${host}:${grafanaPort}`);
  }
  console.log('│');
  console.log('│  Login: admin / <password in ~/.iac-toolbox/credentials>');
  console.log('│');
  console.log('│  Suggested dashboards (Grafana → Dashboards → Import):');
  console.log('│    Node Exporter Full        ID 1860');
  console.log('│    Docker Container Metrics  ID 193');
  console.log('└');
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
  // ── Pre-flight ────────────────────────────────────────────
  console.log('◆  Pre-flight checks');

  // 1. Parse config
  const config = loadIacToolboxYaml(
    destination,
    filePath
  ) as IacToolboxApplyConfig;

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

  // 2. Load credentials
  const creds = loadCredentials(profile);
  if (!creds.grafana_admin_password) {
    console.error('│  ✗ Credentials missing: grafana_admin_password not found');
    console.error('│');
    console.error(
      '│  Run `iac-toolbox grafana init` first to set up credentials.'
    );
    console.error('└');
    process.exit(1);
  }
  console.log('│  ✔ Credentials loaded from ~/.iac-toolbox/credentials');

  // 3. SSH connectivity (remote targets only)
  const targetMode = config.target?.mode ?? 'local';
  const targetHost = config.target?.host ?? 'localhost';
  const targetUser = config.target?.user ?? 'pi';
  const targetSshKey = config.target?.ssh_key ?? '~/.ssh/id_ed25519';

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

  // 4. Docker check
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

  // ── Install Sequence ──────────────────────────────────────

  // Step 1: metrics-agent (Node Exporter + Grafana Alloy)
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

  // Step 2: prometheus
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

  // Step 3: cadvisor
  const cadvisorEnabled = config.cadvisor?.enabled !== false;
  if (cadvisorEnabled) {
    // Dynamically import to keep the dependency optional at module load time
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

  // Step 4: grafana
  const grafanaOk = await runStep(() =>
    runGrafanaInstall(destination, profile, filePath)
  );
  if (!grafanaOk) {
    printStepFailure('grafana', 'grafana install --filePath=./iac-toolbox.yml');
    process.exit(1);
  }

  // Step 5: cloudflare (only if enabled)
  const cloudflareEnabled =
    config.cloudflare &&
    (config.cloudflare as CloudflareConfig).enabled === true;

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

  // ── Post-Install Summary ──────────────────────────────────
  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';

  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
