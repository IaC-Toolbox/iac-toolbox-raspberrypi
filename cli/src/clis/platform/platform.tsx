import { Command } from 'commander';
import { render } from 'ink';
import InitWizard from '../init/init-wizard.js';

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
}
