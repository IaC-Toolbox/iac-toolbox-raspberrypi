import { Command } from 'commander';
import { render } from 'ink';
import { runContainerMetricsAlertsInstall } from './container-metrics-alerts-install.js';
import ContainerMetricsAlertsInitWizard from './container-metrics-alerts-init-wizard.js';

export function registerContainerMetricsAlertsCommand(program: Command): void {
  const containerMetricsAlerts = program
    .command('container-metrics-alerts')
    .description(
      'Manage Grafana container-level alert rules (Terraform templates via Ansible)'
    );

  containerMetricsAlerts
    .command('init')
    .description(
      'Enable or disable Grafana container metrics alerts for a service'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action((options: { destination: string; filePath?: string }) => {
      render(
        <ContainerMetricsAlertsInitWizard
          destination={options.destination}
          filePath={options.filePath}
        />,
        {
          exitOnCtrlC: true,
          patchConsole: false,
        }
      );
    });

  containerMetricsAlerts
    .command('install')
    .description(
      'Render Grafana container metrics alert Terraform templates via Ansible'
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
        await runContainerMetricsAlertsInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
