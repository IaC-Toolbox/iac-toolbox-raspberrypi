import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis, CliName } from '../validate-clis.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  github_runner?: {
    enabled?: boolean;
    repo_url?: string;
    labels?: string;
    work_dir?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export async function runGithubRunnerInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  let status: number;
  try {
    validateClis(CliName.GithubRunner, {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Configuration loaded');
    print.pipe();

    // ── Ansible Invocation ────────────────────────────────────
    print.step('Installing GitHub Actions runner...');
    print.divider();

    status = runAnsiblePlaybook('github-runner.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('GitHub Actions runner install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe(
      'If the token expired, re-run `iac-toolbox github-runner init` with a fresh token.'
    );
    print.pipe('To retry: iac-toolbox github-runner install');
    print.closeError();
    process.exit(status ?? 1);
  }

  // ── Success Summary ──────────────────────────────────────
  const repoUrl = config.github_runner?.repo_url ?? '';
  const labels = config.github_runner?.labels ?? 'self-hosted';
  const workDir =
    config.github_runner?.work_dir ?? '~/.iac-toolbox/github-runner';

  print.blank();
  print.step('GitHub Actions runner installed');
  print.pipe();
  print.success(`Runner registered with ${repoUrl}`);
  print.success('Runner service started');
  print.pipe();
  print.pipe(`Labels    ${labels}`);
  print.pipe(`Work dir  ${workDir}`);
  print.pipe();
  print.warning('The registration token expires after 1 hour.');
  print.pipe(
    '  Re-run `iac-toolbox github-runner init` with a fresh token if install fails.'
  );
  print.pipe();
  print.close();
}
