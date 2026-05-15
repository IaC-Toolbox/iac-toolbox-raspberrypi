import { Command } from 'commander';
import { render } from 'ink';
import { runThresholdAlertsInstall } from './threshold-alerts-install.js';
import ThresholdAlertsInitWizard from './threshold-alerts-init-wizard.js';

export function registerThresholdAlertsCommand(program: Command): void {
  const thresholdAlerts = program
    .command('threshold-alerts')
    .description(
      'Manage Grafana threshold alert rules (Terraform templates via Ansible)'
    );

  thresholdAlerts
    .command('init')
    .description('Enable or disable Grafana threshold alerts for this device')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action((options: { destination: string }) => {
      render(<ThresholdAlertsInitWizard destination={options.destination} />, {
        exitOnCtrlC: true,
        patchConsole: false,
      });
    });

  thresholdAlerts
    .command('install')
    .description('Render Grafana alert Terraform templates via Ansible')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(async (options: { destination: string; filePath?: string }) => {
      await runThresholdAlertsInstall(options.destination, options.filePath);
    });
}
