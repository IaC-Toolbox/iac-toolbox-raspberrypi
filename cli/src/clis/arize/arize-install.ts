import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { pollHealth } from '../../validators/health_check.js';
import { validateClis, CliName } from '../validate-clis.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  arize_phoenix?: {
    enabled?: boolean;
    ui_port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  cloudflare?: { enabled?: boolean; [key: string]: unknown };
}

export async function runArizeInstall(
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
    validateClis(CliName.Arize, {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Configuration loaded');
    print.pipe();

    // ── Ansible Invocation ────────────────────────────────────
    print.step('Installing Arize Phoenix...');
    print.divider();

    status = runAnsiblePlaybook('arize-phoenix.yml', {
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
    print.step('Arize Phoenix install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox arize install');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Post-Install Health Check ─────────────────────────────
  const uiPort = (config.arize_phoenix?.ui_port as number | undefined) ?? 6006;
  const domain = config.arize_phoenix?.domain as string | undefined;
  const cloudflareEnabled =
    config.cloudflare &&
    (config.cloudflare as Record<string, unknown>).enabled;
  const healthUrl =
    cloudflareEnabled && domain
      ? `https://${domain}/healthz`
      : `http://localhost:${uiPort}/healthz`;

  print.waiting('Waiting for Arize Phoenix to be healthy...');

  const healthy = await pollHealth(healthUrl, { retries: 30, delayMs: 2000 });

  if (healthy) {
    print.blank();
    print.step('Arize Phoenix installed');
    print.pipe();
    print.success('Container started');
    print.success('Health check passed');
    print.pipe();
    if (cloudflareEnabled && domain) {
      print.pipe(`Public URL   https://${domain}`);
    } else {
      print.pipe(`Local URL    http://localhost:${uiPort}`);
    }
    print.pipe('OTLP gRPC    via Alloy fan-out (no direct app connection needed)');
    print.pipe();
    print.warning(
      'Re-run `iac-toolbox metrics-agent install` to activate Alloy → Phoenix trace forwarding'
    );
    print.pipe();
    print.close();
  } else {
    print.blank();
    print.step('Arize Phoenix install failed');
    print.pipe();
    print.error('Health check did not pass after 60 seconds');
    print.pipe('Check Ansible output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox arize install');
    print.closeError();
    process.exit(1);
  }
}
