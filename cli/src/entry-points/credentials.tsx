import { Command } from 'commander';
import { render } from 'ink';
import CredentialSetDialog from '../components/CredentialSetDialog.js';

export function registerCredentialsCommand(program: Command): void {
  const credentials = program
    .command('credentials')
    .description('Manage API credentials');

  credentials
    .command('set <key>')
    .description('Set a single credential value')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .action((key: string, options: { profile: string }) => {
      render(
        <CredentialSetDialog credentialKey={key} profile={options.profile} />,
        { exitOnCtrlC: true, patchConsole: false }
      );
    });
}
