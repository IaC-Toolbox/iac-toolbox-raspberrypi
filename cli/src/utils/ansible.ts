import { spawnSync, execSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { print } from '../design-system/print.js';

function resolveCliRoot(): string {
  return resolve(fileURLToPath(import.meta.url), '../../../..');
}

export function assertAnsibleInstalled(): void {
  try {
    execSync('ansible-playbook --version', { stdio: 'ignore' });
  } catch {
    print.error(
      'ansible-playbook not found. Install Ansible before running this command.'
    );
    print.pipe('  macOS:  brew install ansible');
    print.pipe('  Debian: sudo apt install ansible');
    print.closeError();
    process.exit(1);
  }
}

export function resolveAnsibleDir(destination: string): string {
  return join(process.cwd(), destination, 'ansible-configurations');
}

export function resolveProjectRoot(): string {
  return resolveCliRoot();
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
