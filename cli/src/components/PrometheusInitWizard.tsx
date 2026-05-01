import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadPrometheusGrafanaUrl,
  updatePrometheusConfig,
} from '../utils/prometheusConfig.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface PrometheusInitWizardProps {
  destination: string;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadPrometheusGrafanaUrl */
  _loadGrafanaUrl?: (destination: string) => string | undefined;
  /** Injectable for testing — defaults to updatePrometheusConfig */
  _updatePrometheusConfig?: (destination: string, grafanaUrl: string) => void;
}

type Step = 'grafana_url' | 'done';

export default function PrometheusInitWizard({
  destination,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadGrafanaUrl = loadPrometheusGrafanaUrl,
  _updatePrometheusConfig = updatePrometheusConfig,
}: PrometheusInitWizardProps) {
  const { exit } = useApp();

  const existingUrl = _loadGrafanaUrl(destination);

  const [step, setStep] = useState<Step>('grafana_url');
  const [inputValue, setInputValue] = useState(
    existingUrl || 'http://localhost:3000'
  );
  const [grafanaUrl, setGrafanaUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updatePrometheusConfig(destination, grafanaUrl);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, grafanaUrl, destination, exit, _updatePrometheusConfig]);

  if (step === 'grafana_url') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Prometheus Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Grafana URL (Prometheus will register as a datasource here)'}
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
              setGrafanaUrl(trimmed);
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
        {'◇  Prometheus configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Grafana URL    '}
        {grafanaUrl}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install Prometheus, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox prometheus install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { PrometheusInitWizardProps, TextInputProps };
