import { Command } from 'commander';

/**
 * Build the `apply` command for the iac-toolbox CLI.
 *
 * Registers options and wires the action to runApplyInstall via a
 * dynamic import so the heavy orchestration module is only loaded
 * when the command is actually invoked.
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
        const { runApplyInstall } = await import('../actions/applyInstall.js');
        await runApplyInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
