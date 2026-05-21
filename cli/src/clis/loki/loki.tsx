import { Command } from 'commander';
import { runLokiInstall } from './loki-install.js';

export function registerLokiCommand(program: Command): void {
  const loki = program
    .command('loki')
    .description('Deploy Grafana Loki for log aggregation');

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
}
