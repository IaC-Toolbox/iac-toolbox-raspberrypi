import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { loadCredentials } from './credentials.js';

export interface InstallResult {
  success: boolean;
  exitCode: number | null;
  lastErrorLine: string | null;
  errorLines: string[] | null;
}

/**
 * Required environment variables for install.sh in local mode.
 */
const REQUIRED_ENV_VARS = [
  'DOCKER_HUB_USERNAME',
  'DOCKER_HUB_TOKEN',
  'DOCKER_IMAGE_NAME',
] as const;

/**
 * Build the environment object for the install script child process.
 *
 * Reads credentials from ~/.iac-toolbox/credentials and merges with
 * current process environment. No .env file is written.
 */
export function buildInstallEnv(
  profile: string = 'default',
  dockerHubUsername?: string,
  dockerImageName?: string,
  becomePassword?: string
): Record<string, string> {
  const creds = loadCredentials(profile);

  return {
    ...(process.env as Record<string, string>),
    DOCKER_HUB_USERNAME: dockerHubUsername || creds.docker_hub_username || '',
    DOCKER_HUB_TOKEN: creds.docker_hub_token || '',
    DOCKER_IMAGE_NAME: dockerImageName || creds.docker_image_name || '',
    ANSIBLE_BECOME_PASSWORD: becomePassword || '',
  };
}

/**
 * Resolve the path to install.sh from the destination directory.
 */
export function resolveInstallScript(destination: string): string {
  return `${destination}/scripts/install.sh`;
}

/**
 * Check that install.sh exists at the expected path.
 */
export function installScriptExists(destination: string): boolean {
  return fs.existsSync(resolveInstallScript(destination));
}

/**
 * Get the list of required environment variable names.
 */
export function getRequiredEnvVars(): readonly string[] {
  return REQUIRED_ENV_VARS;
}

/**
 * Get the manual run command string.
 */
export function getManualRunCommand(destination: string): string {
  return `bash ${resolveInstallScript(destination)} --ansible-only --local`;
}

/**
 * Run the install script with --ansible-only --local flags.
 *
 * When onLine callback is provided, pipes stdout/stderr to capture output.
 * When onLine is not provided, inherits all stdio for interactive mode (password prompts).
 * Returns a promise that resolves with the exit code and last error line.
 */
export function runInstallScript(
  destination: string,
  env: Record<string, string>,
  onLine?: (line: string) => void
): Promise<InstallResult> {
  return new Promise((resolve) => {
    const scriptPath = resolveInstallScript(destination);

    if (!fs.existsSync(scriptPath)) {
      const msg = `install.sh not found at ${scriptPath}`;
      onLine?.(msg);
      resolve({
        success: false,
        exitCode: 1,
        lastErrorLine: msg,
        errorLines: [msg],
      });
      return;
    }

    // If no onLine callback, use 'inherit' for interactive mode (password prompts)
    // Otherwise pipe streams to capture output
    const child = spawn('bash', [scriptPath, '--ansible-only', '--local'], {
      env,
      stdio: onLine ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    }) as ChildProcess;

    let lastStderrLine = '';
    const stderrLines: string[] = [];
    const maxErrorLines = 15;

    if (onLine) {
      const emitLines = (text: string) => {
        const lines = text.split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
          onLine(line);
        }
        return lines;
      };

      // Capture and forward stdout lines
      child.stdout?.on('data', (data: Buffer) => {
        emitLines(data.toString());
      });

      // Capture stderr lines for error summary and forward to caller
      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = emitLines(text);

        // Add new lines to the buffer
        stderrLines.push(...lines);

        // Keep only the last maxErrorLines
        if (stderrLines.length > maxErrorLines) {
          stderrLines.splice(0, stderrLines.length - maxErrorLines);
        }

        // Track the very last line for backwards compatibility
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          lastStderrLine = lastLine;
        }
      });
    }

    const sigintHandler = () => {
      child.kill('SIGINT');
    };
    process.on('SIGINT', sigintHandler);

    child.on('close', (code) => {
      process.removeListener('SIGINT', sigintHandler);
      setTimeout(() => {
        resolve({
          success: code === 0,
          exitCode: code,
          lastErrorLine: code !== 0 ? lastStderrLine || null : null,
          errorLines: code !== 0 && stderrLines.length > 0 ? stderrLines : null,
        });
      }, 100);
    });

    child.on('error', (err) => {
      process.removeListener('SIGINT', sigintHandler);
      onLine?.(err.message);
      setTimeout(() => {
        resolve({
          success: false,
          exitCode: 1,
          lastErrorLine: err.message,
          errorLines: [err.message],
        });
      }, 100);
    });
  });
}
