import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

export async function runCAdvisorUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Uninstalling cAdvisor...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('cadvisor-uninstall.yml', {
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
    print.step('cAdvisor uninstall failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox cadvisor uninstall');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ───────────────────────────────────────
  print.blank();
  print.step('cAdvisor removed');
  print.pipe();
  print.success('Container stopped and removed');
  print.success('Config directory removed');
  print.pipe();
  print.close();
}
