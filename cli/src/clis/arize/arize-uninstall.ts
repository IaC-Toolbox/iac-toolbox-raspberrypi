import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

export async function runArizeUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Uninstalling Arize Phoenix...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('arize-phoenix-uninstall.yml', {
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
    print.step('Arize Phoenix uninstall failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox arize uninstall');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ───────────────────────────────────────
  print.blank();
  print.step('Arize Phoenix removed');
  print.pipe();
  print.success('Container stopped and removed');
  print.success('Trace data removed');
  print.success('Config directory removed');
  print.pipe();
  print.close();
}
