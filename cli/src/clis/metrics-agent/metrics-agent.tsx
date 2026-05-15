import { Command } from 'commander';
import { render } from 'ink';
import { runMetricsAgentInstall } from './metrics-agent-install.js';
import MetricsAgentInitWizard from './metrics-agent-init-wizard.js';

export function registerMetricsAgentCommand(program: Command): void {
  const metricsAgent = program
    .command('metrics-agent')
    .description(
      'Deploy observability agent (Node Exporter + Grafana Alloy + cAdvisor)'
    );

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
      'Install or reinstall metrics agent (Node Exporter + Grafana Alloy + cAdvisor)'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .action(
      async (options: {
        destination: string;
        filePath?: string;
        profile: string;
      }) => {
        await runMetricsAgentInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
