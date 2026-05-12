#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
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
  .description('Start the observability setup wizard')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option('--output <path>', 'Path to write config file', './iac-toolbox.yml')
  .action(async (options: { profile: string; output: string }) => {
    const { default: InitWizard } = await import('./components/InitWizard.js');
    render(<InitWizard profile={options.profile} output={options.output} />, {
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
  .command('init')
  .description('Collect Cloudflare API credentials and tunnel config')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(async (options: { profile: string; destination: string }) => {
    const { default: CloudflareInitWizard } = await import(
      './components/CloudflareInitWizard.js'
    );
    render(
      <CloudflareInitWizard
        profile={options.profile}
        destination={options.destination}
      />,
      {
        exitOnCtrlC: true,
        patchConsole: false,
      }
    );
  });

cloudflare
  .command('install')
  .description('Install or reinstall Cloudflare Tunnel')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath?: string;
    }) => {
      const { runCloudflareInstall } = await import(
        './actions/cloudflareInstall.js'
      );
      await runCloudflareInstall(
        options.destination,
        options.profile,
        options.filePath
      );
    }
  );

cloudflare
  .command('uninstall')
  .description('Remove Cloudflare Tunnel from this device')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/uninstall-cloudflared.sh', '--local'],
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
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath?: string;
    }) => {
      const { default: GrafanaInitWizard } = await import(
        './components/GrafanaInitWizard.js'
      );
      render(
        <GrafanaInitWizard
          profile={options.profile}
          destination={options.destination}
          filePath={options.filePath}
        />,
        {
          exitOnCtrlC: true,
          patchConsole: false,
        }
      );
    }
  );

grafana
  .command('install')
  .description('Install or reinstall Grafana observability stack')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath?: string;
    }) => {
      const { runGrafanaInstall } = await import('./actions/grafanaInstall.js');
      await runGrafanaInstall(
        options.destination,
        options.profile,
        options.filePath
      );
    }
  );

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
  .command('init')
  .description('Configure Grafana URL for Prometheus')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(async (options: { destination: string; filePath?: string }) => {
    const { default: PrometheusInitWizard } = await import(
      './components/PrometheusInitWizard.js'
    );
    render(
      <PrometheusInitWizard
        destination={options.destination}
        filePath={options.filePath}
      />,
      { exitOnCtrlC: true, patchConsole: false }
    );
  });

prometheus
  .command('install')
  .description('Install or reinstall Prometheus metrics collection')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath?: string;
    }) => {
      const { runPrometheusInstall } = await import(
        './actions/prometheusInstall.js'
      );
      await runPrometheusInstall(
        options.destination,
        options.profile,
        options.filePath
      );
    }
  );

const metricsAgent = program
  .command('metrics-agent')
  .description('Manage metrics agent (Node Exporter + Grafana Alloy)');

metricsAgent
  .command('init')
  .description('Configure Prometheus remote_write URL for metrics agent')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(async (options: { destination: string }) => {
    const { default: MetricsAgentInitWizard } = await import(
      './components/MetricsAgentInitWizard.js'
    );
    render(<MetricsAgentInitWizard destination={options.destination} />, {
      exitOnCtrlC: true,
      patchConsole: false,
    });
  });

metricsAgent
  .command('install')
  .description(
    'Install or reinstall metrics agent (Node Exporter + Grafana Alloy)'
  )
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(async (options: { destination: string; filePath?: string }) => {
    const { runMetricsAgentInstall } = await import(
      './actions/metricsAgentInstall.js'
    );
    await runMetricsAgentInstall(options.destination, options.filePath);
  });

metricsAgent
  .command('uninstall')
  .description('Remove metrics agent from this device')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/uninstall-metrics-agent.sh', '--local'],
      { stdio: 'inherit' }
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

const target = program
  .command('target')
  .description('Configure the target device for deployments');

target
  .command('init')
  .description('Set up the target device (localhost or remote SSH)')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(async (options: { destination: string }) => {
    const { default: TargetInitWizard } = await import(
      './components/TargetInitWizard.js'
    );
    render(<TargetInitWizard destination={options.destination} />, {
      exitOnCtrlC: true,
      patchConsole: false,
    });
  });

program
  .command('apply')
  .description('Install the full observability stack from a config file')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to iac-toolbox.yml', './iac-toolbox.yml')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath: string;
    }) => {
      const { runApplyInstall } = await import('./actions/applyInstall.js');
      await runApplyInstall(
        options.destination,
        options.profile,
        options.filePath
      );
    }
  );

program
  .command('install')
  .description('Run install script using existing configuration')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option(
    '--destination <path>',
    'Path to infrastructure directory',
    'infrastructure'
  )
  .option('--filePath <path>', 'Path to a per-device config file')
  .action(
    async (options: {
      profile: string;
      destination: string;
      filePath?: string;
    }) => {
      if (options.filePath) {
        const { runFilePathInstall } = await import(
          './actions/filePathInstall.js'
        );
        await runFilePathInstall(options.filePath, options.destination);
        return;
      }
      const { runStandaloneInstall } = await import(
        './utils/standaloneInstall.js'
      );
      await runStandaloneInstall(options.destination, options.profile);
    }
  );

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
