import { Command } from 'commander';
import { render } from 'ink';
import { runGithubRunnerInstall } from './github-runner-install.js';
import GithubRunnerInitWizard from './github-runner-init-wizard.js';

export function registerGithubRunnerCommand(program: Command): void {
  const runner = program
    .command('github-runner')
    .description('Self-hosted GitHub Actions runner');

  runner
    .command('init')
    .description('Configure GitHub Actions runner')
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
          <GithubRunnerInitWizard
            destination={options.destination}
            profile={options.profile}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  runner
    .command('install')
    .description('Install GitHub Actions runner on device')
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
        await runGithubRunnerInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
