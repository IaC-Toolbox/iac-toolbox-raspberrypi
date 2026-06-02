import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

/**
 * Removes Grafana Alloy from the target host.
 *
 * Stops and removes the grafana-alloy Docker Compose container and deletes
 * the ~/.iac-toolbox/grafana-alloy/ config directory. Alloy does not use
 * named Docker volumes — only the container and config directory are removed.
 *
 * This function does NOT emit a top-level print.step header — the parent caller
 * (runMetricsAgentUninstall or runPlatformUninstall) owns section headers.
 */
export async function runGrafanaAlloyUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  let status: number;
  try {
    status = runAnsiblePlaybook('grafana-alloy-uninstall.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.error('Grafana Alloy uninstall failed');
    print.pipe('Check Ansible output above for details');
    process.exit(status ?? 1);
  }

  print.success('Grafana Alloy container stopped and removed');
  print.success('Config directory removed');
}
