import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { loadCredentials } from '../credentials/credentials-store.js';

export function registerGithubRunnerCommand(program: Command): void {
  const githubRunner = program
    .command('github-runner')
    .description('Manage GitHub Actions self-hosted runner');

  githubRunner
    .command('install')
    .description('Install or reinstall GitHub Actions self-hosted runner')
    .action(() => {
      const creds = loadCredentials('default');
      const env = {
        ...process.env,
        GITHUB_RUNNER_TOKEN: creds.github_runner_token || '',
        GITHUB_RUNNER_REPO_URL: creds.github_runner_repo_url || '',
      };
      const result = spawnSync(
        'bash',
        [
          'infrastructure/scripts/install.sh',
          '--promote-to-github-runner',
          '--local',
        ],
        { env, stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
