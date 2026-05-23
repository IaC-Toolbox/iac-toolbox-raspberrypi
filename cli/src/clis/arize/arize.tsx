import { Command } from 'commander';
import { render } from 'ink';
import { runArizeInstall } from './arize-install.js';
import { runArizeUninstall } from './arize-uninstall.js';
import ArizeInitWizard from './arize-init-wizard.js';

export function registerArizeCommand(program: Command): void {
  const arize = program
    .command('arize')
    .description('Arize Phoenix LLM observability');

  arize
    .command('init')
    .description('Configure Arize Phoenix')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(
      (options: {
        profile: string;
        destination: string;
        filePath?: string;
      }) => {
        render(
          <ArizeInitWizard
            destination={options.destination}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  arize
    .command('install')
    .description('Install Arize Phoenix on device')
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
        await runArizeInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );

  arize
    .command('uninstall')
    .description('Remove Arize Phoenix and all trace data')
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
        await runArizeUninstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
