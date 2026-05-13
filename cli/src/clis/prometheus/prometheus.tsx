import { Command } from 'commander';
import { render } from 'ink';
import { runPrometheusInstall } from './prometheus-install.js';
import PrometheusInitWizard from './prometheus-init-wizard.js';

export function registerPrometheusCommand(program: Command): void {
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
    .action((options: { destination: string; filePath?: string }) => {
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
        await runPrometheusInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
