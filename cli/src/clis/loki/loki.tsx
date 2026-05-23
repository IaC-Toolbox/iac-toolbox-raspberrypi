import { Command } from 'commander';
import { render } from 'ink';
import { runLokiInstall } from './loki-install.js';
import { runLokiUninstall } from './loki-uninstall.js';
import LokiInitWizard from './loki-init-wizard.js';

export function registerLokiCommand(program: Command): void {
  const loki = program
    .command('loki')
    .description('Deploy Grafana Loki for log aggregation');

  loki
    .command('init')
    .description('Configure Loki in iac-toolbox.yml')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action((options: { destination: string; filePath?: string }) => {
      render(
        <LokiInitWizard
          destination={options.destination}
          filePath={options.filePath}
        />,
        { exitOnCtrlC: true, patchConsole: false }
      );
    });

  loki
    .command('install')
    .description('Install or reinstall Grafana Loki + Alloy log collector')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(async (options: { destination: string; filePath?: string }) => {
      await runLokiInstall(options.destination, 'default', options.filePath);
    });

  loki
    .command('uninstall')
    .description('Remove Loki log aggregation and all log data')
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
        await runLokiUninstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
