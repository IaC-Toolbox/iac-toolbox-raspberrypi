import { Command } from 'commander';
import { render } from 'ink';
import { runMetricsAgentInstall } from './metrics-agent-install.js';
import WizardRunner from '../run-wizard.js';

export function registerMetricsAgentCommand(program: Command): void {
  const metricsAgent = program
    .command('metrics-agent')
    .description(
      'Deploy observability agent (Node Exporter + Grafana Alloy + cAdvisor)'
    );

  metricsAgent
    .command('init')
    .description(
      'Enable Grafana Alloy, Node Exporter, and cAdvisor in iac-toolbox.yml'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .action(
      (options: {
        destination: string;
        filePath?: string;
        profile: string;
      }) => {
        render(
          <WizardRunner
            cliName="metrics-agent"
            ctx={{
              destination: options.destination,
              filePath: options.filePath,
              profile: options.profile,
            }}
          />,
          {
            exitOnCtrlC: true,
            patchConsole: false,
          }
        );
      }
    );

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
