import { Command } from 'commander';
import { runApplyInstall } from './apply-install.js';

/**
 * Build the `apply` command for the iac-toolbox CLI.
 *
 * Registers options and wires the action to runApplyInstall.
 */
export function buildApplyCommand(): Command {
  return new Command('apply')
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
        await runApplyInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
