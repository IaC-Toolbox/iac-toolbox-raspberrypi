import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  cadvisor?: { enabled?: boolean; [key: string]: unknown };
}

export async function runCAdvisorInstall(
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

  // ── Guard: cadvisor.enabled ───────────────────────────────
  if (config.cadvisor?.enabled !== true) {
    unlinkSync(tmpFile);
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

  let status: number;
  try {
    status = runAnsiblePlaybook('cadvisor.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('cAdvisor install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox cadvisor install');
    print.closeError();
    process.exit(status ?? 1);
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
