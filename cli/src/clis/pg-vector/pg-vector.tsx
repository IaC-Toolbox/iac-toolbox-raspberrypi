import { Command } from 'commander';
import { render } from 'ink';
import { runPgVectorInstall } from './pg-vector-install.js';
import PgVectorInitWizard from './pg-vector-init-wizard.js';

export function registerPgVectorCommand(program: Command): void {
  const pgVector = program
    .command('pg-vector')
    .description(
      'Deploy PostgreSQL with pgvector extension in a Docker container'
    );

  pgVector
    .command('init')
    .description(
      'Configure pgvector database (admin password, database, port, version)'
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
          <PgVectorInitWizard
            destination={options.destination}
            profile={options.profile}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  pgVector
    .command('install')
    .description('Install or reinstall pgvector database on device')
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
        await runPgVectorInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
