import { Command } from 'commander';
import { render } from 'ink';
import InitWizard from './platform-wizard.js';
import { runPlatformApplyInstall } from './platform-apply-install.js';

export function registerPlatformCommand(program: Command): void {
  const platform = program
    .command('platform')
    .description('Manage the full observability platform');

  platform
    .command('init')
    .description('Start the observability setup wizard')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option('--output <path>', 'Path to write config file', './iac-toolbox.yml')
    .action((options: { profile: string; output: string }) => {
      render(<InitWizard profile={options.profile} output={options.output} />, {
        exitOnCtrlC: true,
        patchConsole: false,
      });
    });

  platform
    .command('apply')
    .description('Install the full observability stack from a config file')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to iac-toolbox.yml', './iac-toolbox.yml')
    .action(
      async (options: {
        profile: string;
        destination: string;
        filePath: string;
      }) => {
        await runPlatformApplyInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
