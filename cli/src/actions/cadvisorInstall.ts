import { spawnSync } from 'child_process';
import { loadIacToolboxYaml } from '../utils/grafanaConfig.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  cadvisor?: { enabled?: boolean; [key: string]: unknown };
}

/**
 * Run `iac-toolbox cadvisor install`.
 *
 * Guards:
 *   1. cadvisor.enabled must be true in iac-toolbox.yml (run `cadvisor init` first)
 *
 * Then invokes install.sh --cadvisor and polls health endpoints post-install.
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
    console.error(
      '│  Set cadvisor.enabled: true in iac-toolbox.yml to install cAdvisor.'
    );
    console.error('└');
    process.exit(1);
  }

  console.log('│  ✔ Configuration loaded');
  console.log('│');

  // ── Ansible Invocation ────────────────────────────────────
  console.log('◆  Installing cAdvisor...');
  console.log('│  ════════════════════════════════════════');

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--cadvisor'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
    env: { ...process.env },
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

  console.log('');
  console.log('◆  cAdvisor installed successfully');
  console.log('│');
  console.log('│  ✔ cAdvisor running');
  console.log('│');
  console.log('│  cAdvisor URL    http://localhost:8080');
  console.log('│');
  console.log('│  Run `iac-toolbox cadvisor uninstall` to remove');
  console.log('└');
}
