import { Command } from 'commander';
import { render } from 'ink';
import { runPostgresqlInstall } from './postgresql-install.js';
import PostgresqlInitWizard from './postgresql-init-wizard.js';

export function registerPostgresqlCommand(program: Command): void {
  const postgresql = program
    .command('postgresql')
    .description(
      'Deploy PostgreSQL in a Docker container with persistent data'
    );

  postgresql
    .command('init')
    .description(
      'Configure PostgreSQL (admin password, database, port, version)'
    )
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(
      (options: {
        profile: string;
        destination: string;
        filePath?: string;
      }) => {
        render(
          <PostgresqlInitWizard
            destination={options.destination}
            profile={options.profile}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  postgresql
    .command('install')
    .description('Install or reinstall PostgreSQL on device')
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
        await runPostgresqlInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
