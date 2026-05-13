import { Command } from 'commander';
import { runFilePathInstall } from './file-path-install.js';
import { runStandaloneInstall } from './standalone-install.js';

export function registerInstallCommand(program: Command): void {
  program
    .command('install')
    .description('Run install script using existing configuration')
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
        if (options.filePath) {
          await runFilePathInstall(options.filePath, options.destination);
          return;
        }
        await runStandaloneInstall(options.destination, options.profile);
      }
    );
}
