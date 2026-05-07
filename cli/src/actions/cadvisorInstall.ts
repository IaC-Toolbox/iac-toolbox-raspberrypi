import { spawnSync } from 'child_process';
import os from 'os';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';
import { pollHealth } from '../utils/healthCheck.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  cadvisor?: { enabled?: boolean; [key: string]: unknown };
}

/**
 * Run `iac-toolbox cadvisor install`.
 *
 * Guards:
 *   1. cadvisor.enabled must be true in iac-toolbox.yml (run `cadvisor init` first)
 *   2. Grafana Alloy must be running on port 12345 (run `metrics-agent install` first)
 *
 * Then invokes install.sh --cadvisor --local and polls health endpoints post-install.
 */
export async function runCAdvisorInstall(
  destination: string,
  profile: string
): Promise<void> {
  void profile; // reserved for future credential profile support
  // ── Read Configuration ────────────────────────────────────
  console.log('◆  Reading cAdvisor configuration...');
  const config = loadIacToolboxYaml(destination) as IacToolboxConfig;

  // ── Guard: cadvisor.enabled ───────────────────────────────
  if (config.cadvisor?.enabled !== true) {
    console.error('│  ✗ cAdvisor not enabled');
    console.error('│');
    console.error('│  Run `iac-toolbox cadvisor init` first.');
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Configuration loaded');
  console.log('│');

  // ── Guard: Alloy running ──────────────────────────────────
  console.log('◆  Checking Grafana Alloy health...');
  const alloyUp = await pollHealth('http://localhost:12345/-/ready', {
    retries: 3,
    delayMs: 1000,
  });

  if (!alloyUp) {
    console.error('│  ✗ Grafana Alloy is not running');
    console.error('│');
    console.error('│  Run `iac-toolbox metrics-agent install` first.');
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Grafana Alloy is running');
  console.log('│');

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing cAdvisor...');
  console.log('│  ════════════════════════════════════════');

  const env = {
    ...process.env,
    RPI_HOST: 'localhost',
    RPI_USER: os.userInfo().username,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const result = spawnSync('bash', [scriptPath, '--cadvisor', '--local'], {
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('');
    console.error('◆  cAdvisor install failed');
    console.error('│');
    console.error('│  ✗ Ansible playbook exited with errors');
    console.error('│  Check output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox cadvisor install');
    console.error('└');
    process.exit(result.status ?? 1);
  }

  // ── Post-Install Health Checks ────────────────────────────
  console.log('│  ◜ Waiting for cAdvisor to be healthy...');

  const cadvisorHealthy = await pollHealth('http://localhost:8080/healthz', {
    retries: 30,
    delayMs: 2000,
  });

  console.log('│  ◜ Waiting for Grafana Alloy to be ready...');

  const alloyHealthy = await pollHealth('http://localhost:12345/-/ready', {
    retries: 10,
    delayMs: 2000,
  });

  if (cadvisorHealthy && alloyHealthy) {
    console.log('');
    console.log('◆  cAdvisor installed successfully');
    console.log('│');
    console.log('│  ✔ cAdvisor healthy');
    console.log('│  ✔ Grafana Alloy still ready');
    console.log('│');
    console.log('│  cAdvisor metrics   http://localhost:8080/metrics');
    console.log('│  Alloy UI           http://localhost:12345');
    console.log('│');
    console.log(
      '│  Import Grafana dashboard ID 14282 to visualize container metrics.'
    );
    console.log('│  Run `iac-toolbox cadvisor uninstall` to remove.');
    console.log('└');
  } else {
    console.error('');
    console.error('◆  cAdvisor install failed');
    console.error('│');
    if (!cadvisorHealthy) {
      console.error('│  ✗ cAdvisor health check did not pass after 60 seconds');
    }
    if (!alloyHealthy) {
      console.error(
        '│  ✗ Grafana Alloy health check did not pass after 20 seconds'
      );
    }
    console.error('│  Check Ansible output above for details');
    console.error('│');
    console.error('│  To retry: iac-toolbox cadvisor install');
    console.error('└');
    process.exit(1);
  }
}
