import { spawnSync, spawn, execSync } from 'child_process';
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
  debug?: boolean;
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

function buildAnsibleArgs(playbook: string, options: AnsibleOptions): string[] {
  const args = ['-i', 'inventory/all.yml', `playbooks/${playbook}`];
  if (options.filePath) args.push('--extra-vars', `@${options.filePath}`);
  if (options.projectRoot)
    args.push('--extra-vars', `project_root=${options.projectRoot}`);
  return args;
}

function listAnsibleTasks(playbook: string, options: AnsibleOptions): string[] {
  const args = ['--list-tasks', ...buildAnsibleArgs(playbook, options)];
  const result = spawnSync('ansible-playbook', args, {
    cwd: options.ansibleDir,
    env: options.env ?? process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  if (result.status !== 0 || !result.stdout) return [];
  const lines = result.stdout.split('\n');
  const taskPattern = /^\s{6}(\S.+?)\s+TAGS:/;
  const tasks: string[] = [];
  for (const line of lines) {
    const match = taskPattern.exec(line);
    if (match) tasks.push(match[1]);
  }
  return tasks;
}

export function runAnsiblePlaybookWithProgress(
  playbook: string,
  options: AnsibleOptions
): Promise<number> {
  assertAnsibleInstalled();

  // Debug path: delegate to existing sync runner (raw stdio: inherit)
  if (options.debug) {
    const args = ['-v', ...buildAnsibleArgs(playbook, options)];
    const result = spawnSync('ansible-playbook', args, {
      cwd: options.ansibleDir,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    return Promise.resolve(result.status ?? 1);
  }

  return new Promise<number>((resolve) => {
    // Pre-count tasks
    const taskNames = listAnsibleTasks(playbook, options);
    const totalTasks = taskNames.length;
    const isTTY = process.stdout.isTTY === true;
    const useProgressBar = isTTY && totalTasks > 0;

    if (useProgressBar) {
      print.progress(0, totalTasks, 'Starting\u2026');
    } else {
      print.waiting('Starting Ansible playbook\u2026');
    }

    const args = buildAnsibleArgs(playbook, options);
    const child = spawn('ansible-playbook', args, {
      cwd: options.ansibleDir,
      env: options.env ?? process.env,
      stdio: 'pipe',
    });

    let currentTask = '';
    let completedTasks = 0;
    const stderrLines: string[] = [];
    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const taskMatch = /^TASK \[(.+?)\]/.exec(line);
        if (taskMatch) {
          currentTask = taskMatch[1];
          if (!useProgressBar) {
            print.waiting(currentTask);
          }
        }
        const statusMatch = /^(ok|changed|skipping|failed|fatal): \[/.exec(
          line
        );
        if (statusMatch) {
          completedTasks++;
          if (useProgressBar) {
            print.progress(completedTasks, totalTasks, currentTask);
          }
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() ?? '';
      for (const line of lines) {
        stderrLines.push(line);
      }
    });

    child.on('close', (code: number | null) => {
      // Flush remaining buffers
      if (stdoutBuffer) {
        const taskMatch = /^TASK \[(.+?)\]/.exec(stdoutBuffer);
        if (taskMatch) currentTask = taskMatch[1];
      }
      if (stderrBuffer) stderrLines.push(stderrBuffer);

      if (useProgressBar) {
        print.progressDone();
      }

      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        for (const line of stderrLines) {
          if (line.trim()) print.error(line);
        }
      }
      resolve(exitCode);
    });
  });
}
