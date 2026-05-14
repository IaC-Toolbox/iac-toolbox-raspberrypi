import { spawnSync } from 'child_process';
import { print } from '../../design-system/print.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';

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
  print.step('Reading cAdvisor configuration...');
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxConfig;

  // ── Guard: cadvisor.enabled ───────────────────────────────
  if (config.cadvisor?.enabled !== true) {
    print.error('cAdvisor not enabled');
    print.pipe();
    print.pipe(
      'Set cadvisor.enabled: true in iac-toolbox.yml to install cAdvisor.'
    );
    print.closeError();
    process.exit(1);
  }

  print.success('Configuration loaded');
  print.pipe();

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Installing cAdvisor...');
  print.divider();

  const scriptPath = `${destination}/scripts/install.sh`;
  const scriptArgs = [scriptPath, '--cadvisor'];
  if (filePath) scriptArgs.push('--filePath', filePath);
  const result = spawnSync('bash', scriptArgs, {
    env: { ...process.env },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    print.blank();
    print.step('cAdvisor install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox cadvisor install');
    print.closeError();
    process.exit(result.status ?? 1);
  }

  print.blank();
  print.step('cAdvisor installed successfully');
  print.pipe();
  print.success('cAdvisor running');
  print.pipe();
  print.pipe('cAdvisor URL    http://localhost:8080');
  print.pipe();
  print.pipe('Run `iac-toolbox cadvisor uninstall` to remove');
  print.close();
}
