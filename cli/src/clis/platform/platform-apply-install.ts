import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import {
  testSshConnection,
  checkDockerAvailable,
} from '../../validators/preflight_checks.js';
import {
  printSummaryNoCloudflare,
  printSummaryWithCloudflare,
  type ApplySummaryConfig,
} from './platform-apply-summary.js';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { runTerraform, resolveTerraformDir } from '../../utils/terraform.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';

async function runPreflightChecks(
  config: ApplySummaryConfig
): Promise<{ targetMode: string; targetHost: string }> {
  const targetMode = config.target?.mode ?? 'local';
  const targetHost = (config.target?.host as string | undefined) ?? 'localhost';
  const targetUser = config.target?.user ?? 'pi';
  const targetSshKey =
    (config.target?.ssh_key as string | undefined) ?? '~/.ssh/id_ed25519';

  if (targetMode === 'remote') {
    print.waiting(`Testing SSH connection to ${targetUser}@${targetHost}...`);
    const sshOk = await testSshConnection(targetHost, targetUser, targetSshKey);
    if (!sshOk) {
      print.error(`SSH connection failed to ${targetUser}@${targetHost}`);
      print.pipe();
      print.pipe('Ensure the host is reachable and the SSH key is correct.');
      print.pipe('Fix connectivity, then re-run apply.');
      print.closeError();
      process.exit(1);
    }
    print.success('SSH connection successful');
  }

  const dockerOk = checkDockerAvailable(
    targetMode,
    targetHost,
    targetUser,
    targetSshKey
  );
  if (!dockerOk) {
    print.error('Docker not available on target');
    print.pipe();
    print.pipe('Ensure Docker is installed and running on the target.');
    print.closeError();
    process.exit(1);
  }
  print.success('Docker available on target');
  print.close();

  return { targetMode, targetHost };
}

function runInstallSequence(
  destination: string,
  config: ApplySummaryConfig,
  tmpFile: string
): boolean {
  const env: NodeJS.ProcessEnv = { ...process.env };

  let status: number;
  try {
    status = runAnsiblePlaybook('observability_platform.yml', {
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
    print.step('Observability stack install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe(
      'To retry: iac-toolbox platform apply --filePath=./iac-toolbox.yml'
    );
    print.closeError();
    process.exit(status ?? 1);
  }

  return Boolean(
    config.cloudflare &&
      (config.cloudflare as { enabled?: boolean }).enabled === true
  );
}

function runTerraformSequence(destination: string): void {
  print.step('Provisioning Grafana alert rules via Terraform...');
  print.divider();

  const status = runTerraform({
    terraformDir: resolveTerraformDir(destination),
  });

  if (status !== 0) {
    print.blank();
    print.step('Terraform provisioning failed');
    print.pipe();
    print.error('terraform apply exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe(
      'To retry: iac-toolbox platform apply --filePath=./iac-toolbox.yml'
    );
    print.closeError();
    process.exit(status);
  }

  print.success('Alert rules provisioned');
  print.close();
}

export async function runPlatformApplyInstall(
  destination: string,
  profile: string,
  filePath: string
): Promise<void> {
  print.step('Pre-flight checks');

  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as ApplySummaryConfig;

  const { targetMode, targetHost } = await runPreflightChecks(config);

  const cloudflareEnabled = runInstallSequence(destination, config, tmpFile);

  // const resolvedConfig = yaml.load(resolvedYaml) as Record<string, unknown>;
  // const alertsConfig = resolvedConfig.threshold_alerts as
  //   | { enabled?: boolean }
  //   | undefined;

  // if (alertsConfig?.enabled === true) {
  //   runTerraformSequence(destination);
  // }

  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
