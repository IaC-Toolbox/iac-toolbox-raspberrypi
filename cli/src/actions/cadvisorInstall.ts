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
  profile: string,
  filePath?: string
): Promise<void> {
  void profile; // reserved for future credential profile support
  // ── Read Configuration ────────────────────────────────────
  console.log('◆  Reading cAdvisor configuration...');
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

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

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing cAdvisor...');
  console.log('│  ════════════════════════════════════════');

  const env = {
    ...process.env,
    RPI_HOST: 'localhost',
    RPI_USER: os.userInfo().username,
  };

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--cadvisor'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
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
}
