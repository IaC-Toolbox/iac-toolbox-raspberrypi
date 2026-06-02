import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

export async function runPrometheusUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Uninstalling Prometheus...');
  print.warning(
    'This will permanently delete all metric data stored in prometheus_data.'
  );
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('prometheus-uninstall.yml', {
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
    print.step('Prometheus uninstall failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox prometheus uninstall');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ───────────────────────────────────────
  print.blank();
  print.step('Prometheus removed');
  print.pipe();
  print.success('Container stopped and removed');
  print.success('Volume prometheus_data removed');
  print.success('Config directory removed');
  print.pipe();
  print.close();
}
