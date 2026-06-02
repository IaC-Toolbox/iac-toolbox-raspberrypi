import { unlinkSync } from 'fs';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

export async function runCloudflareUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile } = writeResolvedConfig(destination, profile, filePath);

  // ── Ansible Invocation ────────────────────────────────────
  print.step('Uninstalling Cloudflare Tunnel...');
  print.divider();

  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('cloudflare-uninstall.yml', {
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
    print.step('Cloudflare Tunnel uninstall failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox cloudflare uninstall');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ───────────────────────────────────────
  print.blank();
  print.step('Cloudflare Tunnel removed');
  print.pipe();
  print.success('cloudflared service stopped and disabled');
  print.success('Tunnel deleted from Cloudflare');
  print.success('cloudflared binary removed');
  print.success('Config directory removed');
  print.pipe();
  print.warning(
    'DNS CNAME records pointing to this tunnel must be removed manually in the Cloudflare dashboard'
  );
  print.pipe();
  print.close();
}
