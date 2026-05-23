import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

/**
 * Removes Node Exporter from the target host.
 *
 * On Linux: stops and disables the systemd service, removes the service file,
 * reloads the daemon, and deletes the binary at /usr/local/bin/node_exporter.
 *
 * On macOS: unloads the launchd agent, removes the plist, and deletes the
 * ~/.iac-toolbox/node-exporter directory.
 *
 * This function does NOT emit a top-level print.step header — the parent caller
 * (runMetricsAgentUninstall or runPlatformUninstall) owns section headers.
 */
export async function runNodeExporterUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  let status: number;
  try {
    status = runAnsiblePlaybook('node-exporter-uninstall.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.error('Node Exporter uninstall failed');
    print.pipe('Check Ansible output above for details');
    process.exit(status ?? 1);
  }

  print.success('Node Exporter service stopped and disabled');
  print.success('Node Exporter binary removed');
  print.success('Systemd service file removed');
}
