import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { render } from 'ink';
import { runGrafanaInstall } from '../actions/grafanaInstall.js';
import GrafanaInitWizard from '../components/GrafanaInitWizard.js';

export function registerGrafanaCommand(program: Command): void {
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
      (options: { profile: string; destination: string; filePath?: string }) => {
        render(
          <GrafanaInitWizard
            profile={options.profile}
            destination={options.destination}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
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
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/uninstall-loki.sh', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
