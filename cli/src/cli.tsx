#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import App from './app.js';
import CredentialSetDialog from './components/CredentialSetDialog.js';
import { validateArchitecture } from './validators/architecture.js';

// Pre-flight check: validate architecture
const validation = validateArchitecture();

if (validation.warning) {
  console.warn(`\n⚠️  ${validation.warning}\n`);
  console.log('Press Ctrl+C to exit or wait 3 seconds to continue...\n');

  // Give user time to cancel if they want
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

const program = new Command();

program
  .name('iac-toolbox')
  .description('Infrastructure automation CLI for homelabs')
  .version('1.0.0', '-v, --version', 'Output the current version')
  .option('-C <path>', 'Run as if started in <path>')
  .option('-c <name>=<value>', 'Set config variable')
  .option('--profile <name>', 'Credential profile to use', 'default');

program
  .command('init', { isDefault: true })
  .description('Start the interactive wizard')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .action((options) => {
    render(<App profile={options.profile} />, {
      exitOnCtrlC: true,
      patchConsole: false,
    });
  });

const credentials = program
  .command('credentials')
  .description('Manage API credentials');

credentials
  .command('set <key>')
  .description('Set a single credential value')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .action((key: string, options: { profile: string }) => {
    render(
      <CredentialSetDialog credentialKey={key} profile={options.profile} />,
      {
        exitOnCtrlC: true,
        patchConsole: false,
      }
    );
  });

const cloudflare = program
  .command('cloudflare')
  .description('Manage Cloudflare Tunnel integration');

cloudflare
  .command('install')
  .description('Install or reinstall Cloudflare Tunnel')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const { loadCredentials } = await import('./utils/credentials.js');
    const creds = loadCredentials('default');
    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: creds.cloudflare_api_token || '',
    };
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--cloudflared', '--local'],
      {
        env,
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

cloudflare
  .command('uninstall')
  .description('Remove Cloudflare Tunnel from this device')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/uninstall-cloudflare.sh', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const vault = program
  .command('vault')
  .description('Manage HashiCorp Vault integration');

vault
  .command('install')
  .description('Install or reinstall HashiCorp Vault')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--vault', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

vault
  .command('uninstall')
  .description('Remove HashiCorp Vault from this device')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/uninstall-vault.sh', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const grafana = program
  .command('grafana')
  .description('Manage Grafana observability stack');

grafana
  .command('init')
  .description('Collect Grafana credentials')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .action(async (options: { profile: string; destination: string }) => {
    const { default: GrafanaInitWizard } = await import(
      './components/GrafanaInitWizard.js'
    );
    render(
      <GrafanaInitWizard
        profile={options.profile}
        destination={options.destination}
      />,
      {
        exitOnCtrlC: true,
        patchConsole: false,
      }
    );
  });

grafana
  .command('install')
  .description('Install or reinstall Grafana observability stack')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .action(async (options: { profile: string; destination: string }) => {
    const { runGrafanaInstall } = await import('./actions/grafanaInstall.js');
    await runGrafanaInstall(options.destination, options.profile);
  });

grafana
  .command('uninstall')
  .description('Remove Grafana and all observability data')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/uninstall-loki.sh', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const loki = program.command('loki').description('Manage Loki log collection');

loki
  .command('install')
  .description('Install or reinstall Loki log collection')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--loki', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const prometheus = program
  .command('prometheus')
  .description('Manage Prometheus metrics collection');

prometheus
  .command('install')
  .description('Install or reinstall Prometheus metrics collection')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--prometheus', '--local'],
      {
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const githubBuildWorkflow = program
  .command('github-build-workflow')
  .description('Manage GitHub Build Workflow templates');

githubBuildWorkflow
  .command('install')
  .description('Install or reinstall GitHub Build Workflow templates')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const { loadCredentials } = await import('./utils/credentials.js');
    const creds = loadCredentials('default');
    const env = {
      ...process.env,
      DOCKER_HUB_TOKEN: creds.docker_hub_token || '',
      DOCKER_HUB_USERNAME: creds.docker_hub_username || '',
    };
    const result = spawnSync(
      'bash',
      [
        'infrastructure/scripts/install.sh',
        '--github-build-workflow',
        '--local',
      ],
      {
        env,
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

const githubRunner = program
  .command('github-runner')
  .description('Manage GitHub Actions self-hosted runner');

githubRunner
  .command('install')
  .description('Install or reinstall GitHub Actions self-hosted runner')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const { loadCredentials } = await import('./utils/credentials.js');
    const creds = loadCredentials('default');
    const env = {
      ...process.env,
      GITHUB_RUNNER_TOKEN: creds.github_runner_token || '',
      GITHUB_RUNNER_REPO_URL: creds.github_runner_repo_url || '',
    };
    const result = spawnSync(
      'bash',
      [
        'infrastructure/scripts/install.sh',
        '--promote-to-github-runner',
        '--local',
      ],
      {
        env,
        stdio: 'inherit',
      }
    );
    process.exit(result.status ?? 1);
  });

program
  .command('install')
  .description('Run install script using existing configuration')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .action(async (options: { profile: string; destination: string }) => {
    const { runStandaloneInstall } = await import(
      './utils/standaloneInstall.js'
    );
    await runStandaloneInstall(options.destination, options.profile);
  });

program
  .command('uninstall')
  .description('Remove the previously installed infra')
  .action(() => {
    console.log('Uninstall functionality coming soon...');
    process.exit(0);
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();
