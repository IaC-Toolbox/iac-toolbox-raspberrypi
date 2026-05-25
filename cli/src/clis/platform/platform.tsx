import { Command } from 'commander';
import { render } from 'ink';
import WizardRunner from '../run-wizard.js';
import { runPlatformApplyInstall } from './platform-apply-install.js';

export function registerPlatformCommand(program: Command): void {
  const platform = program
    .command('platform')
    .description('Manage the full observability platform');

  platform
    .command('init')
    .description('Start the observability setup wizard')
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
            cliName="platform"
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

  platform
    .command('apply')
    .description('Install the full observability stack from a config file')
    .option('--filePath <path>', 'Path to iac-toolbox.yml', './iac-toolbox.yml')
    .option('--debug', 'Stream raw Ansible output instead of the progress bar')
    .action(async (options: { filePath: string; debug?: boolean }) => {
      await runPlatformApplyInstall(
        'infrastructure',
        'default',
        options.filePath,
        options.debug
      );
    });
}
