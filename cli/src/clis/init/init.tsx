import { Command } from 'commander';
import { render } from 'ink';
import InitWizard from './init-wizard.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init', { isDefault: true })
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
