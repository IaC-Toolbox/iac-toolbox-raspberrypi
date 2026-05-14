import { Command } from 'commander';
import { runCAdvisorInstall } from './cadvisor-install.js';

export function registerCAdvisorCommand(program: Command): void {
  const cAdvisor = program
    .command('cadvisor')
    .description('Deploy cAdvisor for container monitoring');

  cAdvisor
    .command('install')
    .description('Install or reinstall cAdvisor for container monitoring')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(async (options: { destination: string; filePath?: string }) => {
      await runCAdvisorInstall(
        options.destination,
        'default',
        options.filePath
      );
    });
}
