import { Command } from 'commander';

export function registerUninstallCommand(program: Command): void {
  program
    .command('uninstall')
    .description('Remove the previously installed infra')
    .action(() => {
      console.log('Uninstall functionality coming soon...');
      process.exit(0);
    });
}
