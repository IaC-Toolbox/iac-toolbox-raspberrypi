import { spawnSync, execSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

export function assertAnsibleInstalled(): void {
  try {
    execSync('ansible-playbook --version', { stdio: 'ignore' });
  } catch {
    console.error(
      'ansible-playbook not found. Install Ansible before running this command.\n' +
        '  macOS:  brew install ansible\n' +
        '  Debian: sudo apt install ansible'
    );
    process.exit(1);
  }
}

export function resolveAnsibleDir(destination: string): string {
  // Walk up from compiled JS (dist/) to repo root, then into ansible-configurations/
  const cliRoot = resolve(fileURLToPath(import.meta.url), '../../../../..');
  return join(cliRoot, destination, 'ansible-configurations');
}

export function resolveProjectRoot(): string {
  const cliRoot = resolve(fileURLToPath(import.meta.url), '../../../../..');
  return cliRoot;
}

export interface AnsibleOptions {
  ansibleDir: string;
  filePath?: string;
  projectRoot?: string;
  env?: NodeJS.ProcessEnv;
}

export function runAnsiblePlaybook(
  playbook: string,
  options: AnsibleOptions
): number {
  assertAnsibleInstalled();
  const args = ['-i', 'inventory/all.yml', `playbooks/${playbook}`];
  if (options.filePath) args.push('--extra-vars', `@${options.filePath}`);
  if (options.projectRoot)
    args.push('--extra-vars', `project_root=${options.projectRoot}`);
  const result = spawnSync('ansible-playbook', args, {
    cwd: options.ansibleDir,
    env: options.env ?? process.env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}
