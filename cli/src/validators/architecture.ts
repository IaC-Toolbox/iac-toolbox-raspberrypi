import os from 'os';

export interface ArchitectureValidation {
  isSupported: boolean;
  arch: string;
  platform: string;
  warning?: string;
}

/**
 * Validates that the system architecture is ARM64 or allows x64 with warning.
 *
 * @returns Validation result with architecture details and optional warning
 */
export function validateArchitecture(): ArchitectureValidation {
  const arch = os.arch();
  const platform = os.platform();

  // ARM64 variants (arm64, aarch64)
  const isSupported = arch === 'arm64' || arch === 'aarch64';

  return {
    isSupported,
    arch,
    platform,
    warning: !isSupported
      ? `Detected ${arch} on ${platform}. This tool is optimized for ARM64/Raspberry Pi. You can proceed for testing purposes, but some features may not work as expected.`
      : undefined,
  };
}
