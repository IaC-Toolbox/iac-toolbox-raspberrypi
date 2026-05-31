import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis, CliName } from '../validate-clis.js';
import { loadTailscaleAuthKey } from './tailscale-config.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  tailscale?: {
    enabled?: boolean;
    hostname?: string;
    [key: string]: unknown;
  };
}

export async function runTailscaleInstall(
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

  let status: number;
  try {
    validateClis(CliName.Tailscale, {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Configuration loaded');
    print.pipe();

    // ── Load auth key from credentials store ────────────────────────────
    const authKey = loadTailscaleAuthKey(profile);
    if (!authKey) {
      print.error('Tailscale auth key not configured');
      print.pipe();
      print.pipe(
        'Run `iac-toolbox tailscale init` to configure your Tailscale auth key.'
      );
      print.closeError();
      process.exit(1);
    }

    // ── Ansible Invocation ────────────────────────────────────
    print.step('Deploying Tailscale...');
    print.divider();

    status = runAnsiblePlaybook('tailscale.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
      extraVars: { tailscale_auth_key: authKey },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('Tailscale install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe(
      'If the auth key expired, re-run `iac-toolbox tailscale init` with a new key.'
    );
    print.pipe('To retry: iac-toolbox tailscale install');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ──────────────────────────────────────
  const hostname = config.tailscale?.hostname || '';

  print.blank();
  print.step('Tailscale is connected');
  print.pipe();
  print.success('Tailscale package installed');
  print.success('tailscaled service enabled and running');
  print.success('Device authenticated to tailnet');
  print.pipe();
  if (hostname) {
    print.pipe(`Hostname        ${hostname}`);
  }
  print.pipe('');
  print.pipe('Mac setup (run once on your Mac):');
  print.pipe('  brew install tailscale');
  print.pipe('  sudo tailscaled &');
  print.pipe('  tailscale up');
  print.pipe(
    '  # or install the Tailscale Mac app from tailscale.com/download'
  );
  print.pipe();
  print.pipe(
    'After Mac joins the same tailnet, connect to any device service:'
  );
  print.pipe('  ssh pi@<tailscale-ip>');
  print.pipe('  postgresql://user@<tailscale-ip>:5432/mydb');
  print.close();
}
