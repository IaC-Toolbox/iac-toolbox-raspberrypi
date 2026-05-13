import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadMetricsAgentRemoteWriteUrl,
  updateMetricsAgentConfig,
} from './metrics-agent-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface MetricsAgentInitWizardProps {
  destination: string;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadMetricsAgentRemoteWriteUrl */
  _loadRemoteWriteUrl?: (destination: string) => string | undefined;
  /** Injectable for testing — defaults to updateMetricsAgentConfig */
  _updateMetricsAgentConfig?: (destination: string, url: string) => void;
}

type Step = 'remote_write_url' | 'done';

export default function MetricsAgentInitWizard({
  destination,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadRemoteWriteUrl = loadMetricsAgentRemoteWriteUrl,
  _updateMetricsAgentConfig = updateMetricsAgentConfig,
}: MetricsAgentInitWizardProps) {
  const { exit } = useApp();

  const existingUrl = _loadRemoteWriteUrl(destination);

  const [step, setStep] = useState<Step>('remote_write_url');
  const [inputValue, setInputValue] = useState(
    existingUrl || 'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
  );
  const [remoteWriteUrl, setRemoteWriteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updateMetricsAgentConfig(destination, remoteWriteUrl);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, remoteWriteUrl, destination, exit, _updateMetricsAgentConfig]);

  if (step === 'remote_write_url') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Metrics Agent Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Prometheus remote_write URL (metrics will be pushed here)'}
        </Text>
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
              if (!trimmed) {
                setError('URL must not be empty');
                return;
              }
              if (
                !trimmed.startsWith('http://') &&
                !trimmed.startsWith('https://')
              ) {
                setError('URL must start with http:// or https://');
                return;
              }
              setRemoteWriteUrl(trimmed);
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
        {'◇  Metrics agent configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Remote write URL    '}
        {remoteWriteUrl}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install the metrics agent, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox metrics-agent install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { MetricsAgentInitWizardProps, TextInputProps };
