import { Command } from 'commander';
import { render } from 'ink';
import TargetInitWizard from './target-init-wizard.js';

export function registerTargetCommand(program: Command): void {
  const target = program
    .command('target')
    .description('Configure the target device for deployments');

  target
    .command('init')
    .description('Set up the target device (localhost or remote SSH)')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action((options: { destination: string }) => {
      render(<TargetInitWizard destination={options.destination} />, {
        exitOnCtrlC: true,
        patchConsole: false,
      });
    });
}
