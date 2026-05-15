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
import {
  runTerraform,
  resolveTerraformDir,
  type TerraformVars,
} from '../../utils/terraform.js';
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

function runTerraformSequence(
  destination: string,
  resolvedConfig: Record<string, unknown>
): void {
  const alerts = resolvedConfig.metrics_threshold_alerts as
    | {
        enabled?: boolean;
        grafana_url?: string;
        grafana_admin_user?: string;
        grafana_admin_password?: string;
        alert_email?: string;
        pagerduty_token?: string;
        pagerduty_service_region?: string;
        pagerduty_user_email?: string;
      }
    | undefined;

  if (!alerts?.grafana_url) {
    print.error(
      'metrics_threshold_alerts.grafana_url is required for Terraform'
    );
    print.pipe(
      'Add grafana_url under metrics_threshold_alerts in iac-toolbox.yml'
    );
    print.closeError();
    process.exit(1);
  }
  if (!alerts.alert_email) {
    print.error(
      'metrics_threshold_alerts.alert_email is required for Terraform'
    );
    print.closeError();
    process.exit(1);
  }

  const grafana = (resolvedConfig.grafana ?? {}) as {
    admin_user?: string;
    admin_password?: string;
  };

  print.step('Provisioning Grafana alert rules via Terraform...');
  print.divider();

  const vars: TerraformVars = {
    grafana_url: alerts.grafana_url,
    grafana_admin_user:
      alerts.grafana_admin_user ?? grafana.admin_user ?? 'admin',
    grafana_admin_password:
      alerts.grafana_admin_password ?? grafana.admin_password ?? '',
    alert_email: alerts.alert_email,
    pagerduty_token: alerts.pagerduty_token ?? '',
    pagerduty_service_region: alerts.pagerduty_service_region ?? 'us',
    pagerduty_user_email: alerts.pagerduty_user_email ?? '',
  };

  const status = runTerraform({
    terraformDir: resolveTerraformDir(destination),
    vars,
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

  const resolvedConfig = yaml.load(resolvedYaml) as Record<string, unknown>;
  const alertsConfig = resolvedConfig.metrics_threshold_alerts as
    | { enabled?: boolean }
    | undefined;
  if (alertsConfig?.enabled === true) {
    runTerraformSequence(destination, resolvedConfig);
  }

  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
