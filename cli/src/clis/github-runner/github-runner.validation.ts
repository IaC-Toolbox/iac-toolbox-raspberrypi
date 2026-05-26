import { print } from '../../design-system/print.js';
import { getCredential } from '../../loaders/credentials-loader.js';

export interface GithubRunnerValidationConfig {
  github_runner?: {
    enabled?: boolean;
    repo_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateGithubRunner(
  _destination: string,
  _filePath: string,
  config: GithubRunnerValidationConfig,
  profile = 'default'
): void {
  if (config.github_runner?.enabled !== true) {
    print.error('GitHub Actions runner not enabled');
    print.pipe();
    print.pipe(
      'Set github_runner.enabled: true in iac-toolbox.yml to install the runner.'
    );
    print.pipe('Run `iac-toolbox github-runner init` to configure.');
    print.closeError();
    process.exit(1);
  }

  const repoUrl = config.github_runner?.repo_url;
  if (!repoUrl || repoUrl.trim().length === 0) {
    print.error('github_runner.repo_url is not set');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox github-runner init` to set the repository URL.'
    );
    print.closeError();
    process.exit(1);
  }

  const pat = getCredential('github_runner_pat', profile);
  if (!pat || pat.trim().length === 0) {
    print.error('GitHub PAT not configured');
    print.pipe();
    print.pipe(
      'Run `iac-toolbox github-runner init` to configure your GitHub Personal Access Token.'
    );
    print.pipe(
      'Required scopes: repo (classic) or Administration read/write (fine-grained).'
    );
    print.closeError();
    process.exit(1);
  }
}
