import { Command } from 'commander';
import { render } from 'ink';
import { runNodeMetricsAlertsInstall } from './node-metrics-alerts-install.js';
import NodeMetricsAlertsInitWizard from './node-metrics-alerts-init-wizard.js';

export function registerNodeMetricsAlertsCommand(program: Command): void {
  const nodeMetricsAlerts = program
    .command('node-metrics-alerts')
    .description(
      'Manage Grafana node-level alert rules (Terraform templates via Ansible)'
    );

  nodeMetricsAlerts
    .command('init')
    .description(
      'Enable or disable Grafana node metrics alerts for this device'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action((options: { destination: string }) => {
      render(
        <NodeMetricsAlertsInitWizard destination={options.destination} />,
        {
          exitOnCtrlC: true,
          patchConsole: false,
        }
      );
    });

  nodeMetricsAlerts
    .command('install')
    .description(
      'Render Grafana node metrics alert Terraform templates via Ansible'
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
        await runNodeMetricsAlertsInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
