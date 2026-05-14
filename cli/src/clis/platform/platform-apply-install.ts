import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { loadCredentials } from '../../loaders/credentials-loader.js';
import {
  testSshConnection,
  checkDockerAvailable,
} from '../../utils/preflightChecks.js';
import {
  printSummaryNoCloudflare,
  printSummaryWithCloudflare,
  type ApplySummaryConfig,
} from './platform-apply-summary.js';
import { print } from '../../design-system/print.js';
import { resolveConfigTemplates } from '../../utils/configResolver.js';
import { loadIacToolboxYaml } from 'src/loaders/yaml-loader.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';

/**
 * Validate config, credentials, SSH (remote only), and Docker.
 * Resolves all {{ var }} template references in the YAML config.
 * Returns target connection info and resolved YAML text.
 * Calls process.exit(1) on any failure.
 */
async function runPreflightChecks(
  config: ApplySummaryConfig,
  filePath: string,
  creds: Record<string, string | undefined>
): Promise<{ targetMode: string; targetHost: string; resolvedYaml: string }> {
  const configIsEmpty =
    !config || (typeof config === 'object' && Object.keys(config).length === 0);
  if (configIsEmpty) {
    print.error(`Config not found: ${filePath}`);
    print.pipe();
    print.pipe(
      'Run `iac-toolbox platform init` first to generate iac-toolbox.yml'
    );
    print.closeError();
    process.exit(1);
  }
  print.success(`Config loaded: ${filePath}`);

  // Read raw YAML text (not parsed — preserve {{ }} syntax for resolution)
  const rawYaml = readFileSync(filePath, 'utf-8');
  const { resolved, missing } = resolveConfigTemplates(rawYaml, creds);

  if (missing.length > 0) {
    print.error('Missing credentials for template variables in config:');
    print.pipe();
    for (const varName of missing) {
      print.pipe(`  ✗ {{ ${varName} }}`);
      print.pipe(`    → run: iac-toolbox credentials set ${varName}`);
      print.pipe();
    }
    print.closeError();
    process.exit(1);
  }
  print.success('All template variables resolved from credentials');

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

  return { targetMode, targetHost, resolvedYaml: resolved };
}

/**
 * Run the full observability stack via a single `observability_platform.yml`
 * Ansible run. Returns whether Cloudflare was enabled in the config.
 */
function runInstallSequence(
  destination: string,
  config: ApplySummaryConfig,
  resolvedYaml: string
): boolean {
  // Write resolved YAML to ~/.iac-toolbox/ (no {{ }} template refs remaining)
  const iacDir = join(homedir(), '.iac-toolbox');
  mkdirSync(iacDir, { recursive: true });
  const tmpFile = join(iacDir, `resolved-config-${Date.now()}.yml`);
  writeFileSync(tmpFile, resolvedYaml, { mode: 0o600 });

  const env: NodeJS.ProcessEnv = { ...process.env };
  // No credential env vars — they are now embedded in resolvedYaml

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

/**
 * Run `iac-toolbox platform apply`.
 *
 * Orchestrates:
 *   1. Pre-flight checks (config, credentials, SSH, Docker)
 *   2. Single Ansible run via observability_platform.yml
 *   3. Post-install summary
 */
export async function runPlatformApplyInstall(
  destination: string,
  profile: string,
  filePath: string
): Promise<void> {
  print.step('Pre-flight checks');

  const config = loadIacToolboxYaml(
    destination,
    filePath
  ) as ApplySummaryConfig;
  const creds = loadCredentials(profile) as Record<string, string | undefined>;

  const { targetMode, targetHost, resolvedYaml } = await runPreflightChecks(
    config,
    filePath,
    creds
  );

  const cloudflareEnabled = runInstallSequence(
    destination,
    config,
    resolvedYaml
  );

  const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
  if (cloudflareEnabled) {
    printSummaryWithCloudflare(config, displayHost);
  } else {
    printSummaryNoCloudflare(config, displayHost);
  }
}
