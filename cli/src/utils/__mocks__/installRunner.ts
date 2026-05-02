import { jest } from '@jest/globals';
import type { InstallResult } from '../installRunner.js';

export const installScriptExists = jest
  .fn<() => boolean>()
  .mockReturnValue(true);
export const buildInstallEnv = jest
  .fn<() => Record<string, string>>()
  .mockReturnValue({});
export const runInstallScript =
  jest.fn<
    (
      destination: string,
      env: Record<string, string>,
      onLine?: (line: string) => void
    ) => Promise<InstallResult>
  >();
export const resolveInstallScript = jest.fn<(destination: string) => string>();
export const getRequiredEnvVars = jest.fn<() => readonly string[]>();
export const getManualRunCommand = jest.fn<(destination: string) => string>();
