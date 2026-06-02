import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

export async function runGrafanaUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Uninstalling Grafana...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-uninstall.yml', {
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
    print.step('Grafana uninstall failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox grafana uninstall');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ───────────────────────────────────────
  print.blank();
  print.step('Grafana removed');
  print.pipe();
  print.success('Container stopped and removed');
  print.success('Volume grafana_data removed');
  print.success('Config directory removed');
  print.pipe();
  print.close();
}
