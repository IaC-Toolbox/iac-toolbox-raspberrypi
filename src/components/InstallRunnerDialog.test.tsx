import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('ink-spinner', () => ({ default: () => null }));

import { render } from 'ink-testing-library';
import InstallRunnerDialog from './InstallRunnerDialog.js';
import type { InstallResult } from '../utils/installRunner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<InstallResult> = {}): InstallResult {
  return {
    success: true,
    exitCode: 0,
    lastErrorLine: null,
    errorLines: null,
    ...overrides,
  };
}

/**
 * Returns a fake _useInstallInput hook and a function to simulate a key press.
 * Captures the latest onKey callback so tests can trigger it on demand.
 */
function makeKeyInputHelper(): {
  useInstallInput: (onKey: (() => void) | null) => void;
  press: () => void;
} {
  let handler: (() => void) | null = null;
  return {
    useInstallInput: (onKey) => {
      handler = onKey;
    },
    press: () => {
      handler?.();
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstallRunnerDialog', () => {
  it('renders spinner while install is running', () => {
    const { useInstallInput } = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();
    const { lastFrame } = render(
      <InstallRunnerDialog
        destination="/tmp/dest"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => true}
        _runInstallScript={() => new Promise(() => {})}
        _useInstallInput={useInstallInput}
      />
    );

    expect(lastFrame()).toContain('Running install');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('renders output lines inline as they arrive via onLine', async () => {
    let capturedOnLine: ((line: string) => void) | undefined;
    const { useInstallInput } = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();

    const { lastFrame } = render(
      <InstallRunnerDialog
        destination="/tmp/dest"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => true}
        _runInstallScript={(_dest, _env, onLine) => {
          capturedOnLine = onLine;
          return new Promise(() => {});
        }}
        _useInstallInput={useInstallInput}
      />
    );

    // Wait for useEffect to fire and capture onLine
    await new Promise((r) => setTimeout(r, 20));

    capturedOnLine?.('Step 1 complete');
    capturedOnLine?.('Step 2 complete');

    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Step 1 complete');
    expect(frame).toContain('Step 2 complete');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete immediately on exit 0', async () => {
    const successResult = makeResult();
    const { useInstallInput } = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();

    render(
      <InstallRunnerDialog
        destination="/tmp/dest"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => true}
        _runInstallScript={() => Promise.resolve(successResult)}
        _useInstallInput={useInstallInput}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).toHaveBeenCalledWith(successResult);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete immediately on failure; shows error banner', async () => {
    const failResult = makeResult({
      success: false,
      exitCode: 1,
      lastErrorLine: 'Something went wrong',
      errorLines: ['Something went wrong'],
    });
    const { useInstallInput } = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();

    const { lastFrame } = render(
      <InstallRunnerDialog
        destination="/tmp/dest"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => true}
        _runInstallScript={() => Promise.resolve(failResult)}
        _useInstallInput={useInstallInput}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).not.toHaveBeenCalled();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Install failed');
    expect(frame).toContain('exit code');
    expect(frame).toContain('Something went wrong');
    expect(frame).toContain('Press any key to continue');
  });

  it('calls onComplete after key press on failure', async () => {
    const failResult = makeResult({
      success: false,
      exitCode: 2,
      lastErrorLine: 'Fatal error',
      errorLines: ['Fatal error'],
    });
    const helper = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();

    render(
      <InstallRunnerDialog
        destination="/tmp/dest"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => true}
        _runInstallScript={() => Promise.resolve(failResult)}
        _useInstallInput={helper.useInstallInput}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).not.toHaveBeenCalled();

    helper.press();

    expect(onComplete).toHaveBeenCalledWith(failResult);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows error and calls onComplete immediately when script not found', async () => {
    const { useInstallInput } = makeKeyInputHelper();
    const onComplete = jest.fn<(r: InstallResult) => void>();

    const { lastFrame } = render(
      <InstallRunnerDialog
        destination="/tmp/missing"
        profile="default"
        onComplete={onComplete}
        _installScriptExists={() => false}
        _runInstallScript={() => Promise.resolve(makeResult())}
        _useInstallInput={useInstallInput}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Install failed');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]?.[0].success).toBe(false);
  });
});
