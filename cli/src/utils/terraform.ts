import { spawnSync, execSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { print } from '../design-system/print.js';

function resolveCliRoot(): string {
  return resolve(fileURLToPath(import.meta.url), '../../../..');
}

// resolveCliRoot is kept for parity with ansible.ts — used by callers that need the project root
export { resolveCliRoot };

export function assertTerraformInstalled(): void {
  try {
    execSync('terraform version', { stdio: 'ignore' });
  } catch {
    print.error(
      'terraform not found. Install Terraform before running this command.'
    );
    print.pipe('  macOS:  brew install hashicorp/tap/terraform');
    print.pipe('  Debian: https://developer.hashicorp.com/terraform/install');
    print.closeError();
    process.exit(1);
  }
}

export function resolveTerraformDir(destination: string): string {
  return join(process.cwd(), destination, 'terraform', 'grafana-alerts');
}

export interface TerraformVars {
  grafana_url: string;
  grafana_admin_user: string;
  grafana_admin_password: string;
  alert_email: string;
  pagerduty_token?: string;
  pagerduty_service_region?: string;
  pagerduty_user_email?: string;
}

export interface TerraformOptions {
  terraformDir: string;
  vars?: TerraformVars;
  env?: NodeJS.ProcessEnv;
}

/**
 * Run `terraform init` then `terraform apply -auto-approve -var-file=<tmpVarsFile>`.
 * Secrets are passed via a temp file (never on the command line).
 * Returns the exit code of `terraform apply` (0 = success).
 */
export function runTerraform(options: TerraformOptions): number {
  assertTerraformInstalled();
  let applyStatus: number;
  try {
    const initResult = spawnSync('terraform', ['init'], {
      cwd: options.terraformDir,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    if ((initResult.status ?? 1) !== 0) return initResult.status ?? 1;

    const applyResult = spawnSync('terraform', ['apply', '-auto-approve'], {
      cwd: options.terraformDir,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    applyStatus = applyResult.status ?? 1;
  } finally {
    // No cleanup needed since we're not using a temp vars file
  }

  return applyStatus;
}
