import { spawnSync } from 'child_process';
import { Command } from 'commander';

export function registerLokiCommand(program: Command): void {
  const loki = program
    .command('loki')
    .description('Manage Loki log collection');

  loki
    .command('install')
    .description('Install or reinstall Loki log collection')
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/install.sh', '--loki', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
