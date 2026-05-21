import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadLokiPort,
  loadLokiRetentionHours,
  updateLokiConfig,
} from './loki-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface LokiInitWizardProps {
  destination: string;
  filePath?: string;
  onComplete?: () => void;
  _TextInput?: (props: TextInputProps) => null;
  _loadLokiPort?: (
    destination: string,
    filePath?: string
  ) => number | undefined;
  _loadLokiRetentionHours?: (
    destination: string,
    filePath?: string
  ) => number | undefined;
  _updateLokiConfig?: (
    destination: string,
    port: number,
    retentionHours: number,
    filePath?: string
  ) => void;
}

type Step = 'port' | 'retention_hours' | 'done';

export default function LokiInitWizard({
  destination,
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadLokiPort = loadLokiPort,
  _loadLokiRetentionHours = loadLokiRetentionHours,
  _updateLokiConfig = updateLokiConfig,
}: LokiInitWizardProps) {
  const { exit } = useApp();

  const existingPort = _loadLokiPort(destination, filePath);
  const existingRetention = _loadLokiRetentionHours(destination, filePath);

  const [step, setStep] = useState<Step>('port');
  const [inputValue, setInputValue] = useState(String(existingPort ?? 3100));
  const [port, setPort] = useState(0);
  const [retentionHours, setRetentionHours] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updateLokiConfig(destination, port, retentionHours, filePath);
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    port,
    retentionHours,
    destination,
    filePath,
    exit,
    onComplete,
    _updateLokiConfig,
  ]);

  if (step === 'port') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Loki Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Loki HTTP port'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              const parsed = parseInt(trimmed, 10);
              if (!trimmed || isNaN(parsed)) {
                setError('Port must be a number');
                return;
              }
              if (parsed < 1 || parsed > 65535) {
                setError('Port must be between 1 and 65535');
                return;
              }
              setPort(parsed);
              setInputValue(String(existingRetention ?? 168));
              setError(null);
              setStep('retention_hours');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'retention_hours') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Loki Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Port: '}
          {port}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Log retention (hours)'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              const parsed = parseInt(trimmed, 10);
              if (!trimmed || isNaN(parsed) || parsed <= 0) {
                setError('Retention must be a positive number of hours');
                return;
              }
              setRetentionHours(parsed);
              setInputValue('');
              setError(null);
              setStep('done');
            }}
          />
        </Box>
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Loki configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Port              '}
        {port}
        {'    → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Retention         '}
        {retentionHours}
        {' h   → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install Loki, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox loki install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { LokiInitWizardProps, TextInputProps };
