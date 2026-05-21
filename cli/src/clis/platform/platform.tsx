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
    .option('--filePath <path>', 'Path to iac-toolbox.yml', './iac-toolbox.yml')
    .action((options: { filePath: string }) => {
      render(<InitWizard profile="default" output={options.filePath} />, {
        exitOnCtrlC: true,
        patchConsole: false,
      });
    });

  platform
    .command('apply')
    .description('Install the full observability stack from a config file')
    .option('--filePath <path>', 'Path to iac-toolbox.yml', './iac-toolbox.yml')
    .action(async (options: { filePath: string }) => {
      await runPlatformApplyInstall('infrastructure', 'default', options.filePath);
    });
}
