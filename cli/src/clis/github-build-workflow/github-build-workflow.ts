import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { loadCredentials } from '../credentials/credentials-store.js';

export function registerGithubBuildWorkflowCommand(program: Command): void {
  const githubBuildWorkflow = program
    .command('github-build-workflow')
    .description('Manage GitHub Build Workflow templates');

  githubBuildWorkflow
    .command('install')
    .description('Install or reinstall GitHub Build Workflow templates')
    .action(() => {
      const creds = loadCredentials('default');
      const env = {
        ...process.env,
        DOCKER_HUB_TOKEN: creds.docker_hub_token || '',
        DOCKER_HUB_USERNAME: creds.docker_hub_username || '',
      };
      const result = spawnSync(
        'bash',
        [
          'infrastructure/scripts/install.sh',
          '--github-build-workflow',
          '--local',
        ],
        { env, stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
