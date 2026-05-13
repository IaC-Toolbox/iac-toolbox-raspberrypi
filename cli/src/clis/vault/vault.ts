import { spawnSync } from 'child_process';
import { Command } from 'commander';

export function registerVaultCommand(program: Command): void {
  const vault = program
    .command('vault')
    .description('Manage HashiCorp Vault integration');

  vault
    .command('install')
    .description('Install or reinstall HashiCorp Vault')
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/install.sh', '--vault', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });

  vault
    .command('uninstall')
    .description('Remove HashiCorp Vault from this device')
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/uninstall-vault.sh', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
