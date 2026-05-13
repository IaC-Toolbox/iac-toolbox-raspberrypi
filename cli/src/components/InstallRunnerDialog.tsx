import { Box, Text } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import Spinner from 'ink-spinner';
import {
  buildInstallEnv,
  runInstallScript,
  installScriptExists,
} from '../utils/installRunner.js';
import type { InstallResult } from '../utils/installRunner.js';
import { useInstallInput } from '../hooks/useInstallInput.js';

interface InstallRunnerDialogProps {
  destination: string;
  profile: string;
  dockerHubUsername?: string;
  dockerImageName?: string;
  becomePassword?: string;
  onComplete: (result: InstallResult) => void;
  /** Injectable for testing — defaults to the real installScriptExists */
  _installScriptExists?: (dest: string) => boolean;
  /** Injectable for testing — defaults to the real runInstallScript */
  _runInstallScript?: (
    dest: string,
    env: Record<string, string>,
    onLine?: (line: string) => void
  ) => Promise<InstallResult>;
  /** Injectable for testing — defaults to useInstallInput */
  _useInstallInput?: (onKey: (() => void) | null) => void;
}

/**
 * Live install screen that spawns install.sh and captures all output lines
 * into the React/Ink tree.
 *
 * - While running: shows a spinner and streams output lines inline.
 * - On success (exit 0): calls onComplete immediately so the wizard advances.
 * - On failure (non-zero exit): renders an error banner below the captured
 *   output and waits for the user to press any key before calling onComplete.
 */
export default function InstallRunnerDialog({
  destination,
  profile,
  dockerHubUsername,
  dockerImageName,
  becomePassword,
  onComplete,
  _installScriptExists = installScriptExists,
  _runInstallScript = runInstallScript,
  _useInstallInput = useInstallInput,
}: InstallRunnerDialogProps) {
  const [running, setRunning] = useState(true);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const addLine = useCallback((line: string) => {
    setOutputLines((prev) => [...prev, line]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!_installScriptExists(destination)) {
      const msg = `install.sh not found at ${destination}/scripts/install.sh. Try re-running \`iac-toolbox platform init\`.`;
      setRunning(false);
      setInitError(msg);
      onComplete({
        success: false,
        exitCode: 1,
        lastErrorLine: `install.sh not found at ${destination}/scripts/install.sh`,
        errorLines: [
          `install.sh not found at ${destination}/scripts/install.sh`,
        ],
      });
      return;
    }

    const env = buildInstallEnv(
      profile,
      dockerHubUsername,
      dockerImageName,
      becomePassword
    );

    _runInstallScript(destination, env, (line) => {
      if (!cancelled) {
        addLine(line);
      }
    }).then((res) => {
      if (!cancelled) {
        setRunning(false);
        if (res.success) {
          onComplete(res);
        } else {
          setResult(res);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    destination,
    profile,
    dockerHubUsername,
    dockerImageName,
    becomePassword,
    onComplete,
    addLine,
    _installScriptExists,
    _runInstallScript,
  ]);

  // Wait for key press on failure before advancing.
  _useInstallInput(
    result && !result.success
      ? () => {
          onComplete(result);
        }
      : null
  );

  if (initError) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="red">
          {'◆ Install failed'}
        </Text>
        <Text>{'│'}</Text>
        <Text>
          {'│ '}
          {initError}
        </Text>
        <Text>{'└'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇ Install now?'}
      </Text>
      <Text>{'│ Yes'}</Text>
      <Text>{'│'}</Text>
      <Text bold>
        {'◆ Running install... '}
        {running && <Spinner type="dots" />}
      </Text>
      <Text>{'│'}</Text>
      {outputLines.map((line, i) => (
        <Text key={i} dimColor>
          {'│ '}
          {line}
        </Text>
      ))}
      {result && !result.success && (
        <>
          <Text>{'│'}</Text>
          <Text bold color="red">
            {'│ ✗ Install failed (exit code '}
            {result.exitCode}
            {')'}
          </Text>
          {result.lastErrorLine && (
            <Text color="red">
              {'│   '}
              {result.lastErrorLine}
            </Text>
          )}
          <Text>{'│'}</Text>
          <Text dimColor>{'│ Press any key to continue...'}</Text>
        </>
      )}
      <Text>{'│'}</Text>
    </Box>
  );
}
