import { print } from '../../design-system/print.js';

export interface GithubRunnerValidationConfig {
  github_runner?: {
    enabled?: boolean;
    repo_url?: string;
    token?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function validateGithubRunner(
  _destination: string,
  _filePath: string,
  config: GithubRunnerValidationConfig
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
    print.pipe('Run `iac-toolbox github-runner init` to set the repository URL.');
    print.closeError();
    process.exit(1);
  }

  const token = config.github_runner?.token;
  if (
    !token ||
    token.trim().length === 0 ||
    token === '{{ github_runner_token }}'
  ) {
    print.error('GitHub runner registration token is not set');
    print.pipe();
    print.pipe('Run `iac-toolbox github-runner init` to set the token.');
    print.closeError();
    process.exit(1);
  }
}
