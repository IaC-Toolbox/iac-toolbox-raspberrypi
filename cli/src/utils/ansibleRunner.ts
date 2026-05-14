import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadCredentials, type CredentialProfile } from './credentials.js';

/**
 * Default path for the non-sensitive configuration file, relative to
 * a project root directory.
 */
const CONFIG_FILE = 'infrastructure/iac-toolbox.yml';

export interface AnsibleRunOptions {
  /** Ansible playbook path (relative or absolute). */
  playbook: string;

  /** Project root directory that contains infrastructure/iac-toolbox.yml. */
  projectDir: string;

  /** Credential profile to use. Defaults to "default". */
  profile?: string;

  /** Extra arguments to pass to ansible-playbook. */
  extraArgs?: string[];

  /** Whether to actually execute (false = dry-run, returns command only). */
  dryRun?: boolean;
}

/**
 * Build the ansible-playbook argument array, combining the non-sensitive
 * config file with credentials from ~/.iac-toolbox/credentials.
 *
 * Non-sensitive values come from infrastructure/iac-toolbox.yml via @file.
 * Secrets come from the credentials file and are passed as individual
 * --extra-vars, so they take highest precedence.
 *
 * Returns an array of arguments suitable for spawnSync (no shell needed).
 */
export function buildAnsibleArgs(options: AnsibleRunOptions): string[] {
  const { playbook, projectDir, profile = 'default', extraArgs = [] } = options;

  const configPath = path.join(projectDir, CONFIG_FILE);
  const creds = loadCredentials(profile);

  const args: string[] = [playbook];

  // Non-sensitive config from file (if it exists)
  if (fs.existsSync(configPath)) {
    args.push('--extra-vars', `@${configPath}`);
  }

  // Secrets from credentials file — passed last for highest precedence
  const secretVars = buildSecretVars(creds);
  if (secretVars) {
    args.push('--extra-vars', secretVars);
  }

  // Any additional arguments
  args.push(...extraArgs);

  return args;
}

/**
 * Build the full command string for display / dry-run purposes only.
 */
export function buildAnsibleCommand(options: AnsibleRunOptions): string {
  const args = buildAnsibleArgs(options);
  return ['ansible-playbook', ...args].join(' ');
}

/**
 * Convert a credential profile into a space-separated key=value string
 * suitable for Ansible --extra-vars.
 *
 * Because we use spawnSync with an argument array, these values are never
 * interpreted by a shell — no escaping is needed.
 */
function buildSecretVars(creds: CredentialProfile): string {
  return Object.entries(creds)
    .filter(([, value]) => value && value.trim() !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

/**
 * Run an Ansible playbook with combined config + credentials.
 *
 * Uses spawnSync with an argument array to avoid shell injection.
 * Throws if the playbook execution fails.
 */
export function runAnsiblePlaybook(options: AnsibleRunOptions): string {
  if (options.dryRun) {
    return buildAnsibleCommand(options);
  }

  const args = buildAnsibleArgs(options);

  const result = spawnSync('ansible-playbook', args, {
    cwd: options.projectDir,
    stdio: 'inherit',
    encoding: 'utf-8',
  });

  if (result.error) {
    throw new Error(`Ansible playbook failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Ansible playbook failed with exit code ${result.status}`);
  }

  return result.stdout || '';
}

/**
 * Validate that required files exist before running a playbook.
 */
export function validateAnsibleSetup(projectDir: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const configPath = path.join(projectDir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    errors.push(`Config file not found: ${configPath}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
