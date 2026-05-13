import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { render } from 'ink';
import { runMetricsAgentInstall } from '../actions/metricsAgentInstall.js';
import MetricsAgentInitWizard from '../components/MetricsAgentInitWizard.js';

export function registerMetricsAgentCommand(program: Command): void {
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
    .action((options: { destination: string }) => {
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
      await runMetricsAgentInstall(options.destination, options.filePath);
    });

  metricsAgent
    .command('uninstall')
    .description('Remove metrics agent from this device')
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/uninstall-metrics-agent.sh', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
