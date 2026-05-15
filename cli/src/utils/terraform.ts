import { spawnSync, execSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { homedir } from 'os';
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
  vars: TerraformVars;
  env?: NodeJS.ProcessEnv;
}

/**
 * Write vars to ~/.iac-toolbox/terraform-vars-<ts>.tfvars (mode 0o600).
 * Returns the temp file path and a cleanup function.
 * Secrets are never passed as -var command-line arguments.
 */
function writeTerraformVarsFile(vars: TerraformVars): {
  tmpFile: string;
  cleanup: () => void;
} {
  const iacDir = join(homedir(), '.iac-toolbox');
  mkdirSync(iacDir, { recursive: true });
  const tmpFile = join(iacDir, `terraform-vars-${Date.now()}.tfvars`);

  const lines: string[] = [
    `grafana_url            = "${vars.grafana_url}"`,
    `grafana_admin_user     = "${vars.grafana_admin_user}"`,
    `grafana_admin_password = "${vars.grafana_admin_password}"`,
    `alert_email            = "${vars.alert_email}"`,
  ];
  if (vars.pagerduty_token)
    lines.push(`pagerduty_token          = "${vars.pagerduty_token}"`);
  if (vars.pagerduty_service_region)
    lines.push(`pagerduty_service_region = "${vars.pagerduty_service_region}"`);
  if (vars.pagerduty_user_email)
    lines.push(`pagerduty_user_email     = "${vars.pagerduty_user_email}"`);

  writeFileSync(tmpFile, lines.join('\n') + '\n', { mode: 0o600 });
  return {
    tmpFile,
    cleanup: () => {
      try {
        unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Run `terraform init` then `terraform apply -auto-approve -var-file=<tmpVarsFile>`.
 * Secrets are passed via a temp file (never on the command line).
 * Returns the exit code of `terraform apply` (0 = success).
 */
export function runTerraform(options: TerraformOptions): number {
  assertTerraformInstalled();
  const { tmpFile, cleanup } = writeTerraformVarsFile(options.vars);
  let applyStatus: number;
  try {
    const initResult = spawnSync('terraform', ['init'], {
      cwd: options.terraformDir,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    if ((initResult.status ?? 1) !== 0) return initResult.status ?? 1;

    const applyResult = spawnSync(
      'terraform',
      ['apply', '-auto-approve', `-var-file=${tmpFile}`],
      {
        cwd: options.terraformDir,
        env: options.env ?? process.env,
        stdio: 'inherit',
      }
    );
    applyStatus = applyResult.status ?? 1;
  } finally {
    cleanup();
  }
  return applyStatus;
}
