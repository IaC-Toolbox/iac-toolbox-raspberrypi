import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolVersion {
  version: string | null;
  isInstalled: boolean;
}

/**
 * Detects if Ansible is installed and returns its version.
 *
 * @returns Tool version information
 */
export async function detectAnsible(): Promise<ToolVersion> {
  try {
    const { stdout } = await execAsync('ansible --version');
    const match = stdout.match(/ansible.*?(\d+\.\d+\.\d+)/);
    return {
      version: match ? match[1] : null,
      isInstalled: true,
    };
  } catch {
    return {
      version: null,
      isInstalled: false,
    };
  }
}

/**
 * Detects if Terraform is installed and returns its version.
 *
 * @returns Tool version information
 */
export async function detectTerraform(): Promise<ToolVersion> {
  try {
    const { stdout } = await execAsync('terraform --version');
    const match = stdout.match(/Terraform v(\d+\.\d+\.\d+)/);
    return {
      version: match ? match[1] : null,
      isInstalled: true,
    };
  } catch {
    return {
      version: null,
      isInstalled: false,
    };
  }
}

/**
 * Checks if Homebrew is available on the system.
 *
 * @returns True if brew is available
 */
export async function isBrewAvailable(): Promise<boolean> {
  try {
    await execAsync('which brew');
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs Ansible using the best available method.
 * Prefers Homebrew on macOS, falls back to pip3.
 *
 * @throws Error if installation fails
 */
export async function installAnsible(): Promise<void> {
  const brewAvailable = await isBrewAvailable();

  if (brewAvailable) {
    await execAsync('brew install ansible');
  } else {
    // Fall back to pip3
    await execAsync('pip3 install --user ansible');
  }
}

/**
 * Installs Terraform using the best available method.
 * Prefers Homebrew on macOS.
 *
 * @throws Error if installation fails
 */
export async function installTerraform(): Promise<void> {
  const brewAvailable = await isBrewAvailable();

  if (brewAvailable) {
    await execAsync('brew tap hashicorp/tap');
    await execAsync('brew install hashicorp/tap/terraform');
  } else {
    // For Linux, download from HashiCorp
    throw new Error(
      'Terraform installation on Linux requires manual setup. Please visit https://www.terraform.io/downloads'
    );
  }
}
