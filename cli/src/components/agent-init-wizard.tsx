import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import { loadAgentConfig, updateAgentConfig } from '../utils/agent-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface AgentInitWizardProps {
  destination: string;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadAgentConfig */
  _loadAgentConfig?: (destination: string) => {
    grafana_url?: string;
    prometheus_remote_write_url?: string;
  };
  /** Injectable for testing — defaults to updateAgentConfig */
  _updateAgentConfig?: (
    destination: string,
    grafanaUrl: string,
    prometheusRemoteWriteUrl: string
  ) => void;
}

type Step = 'grafana_url' | 'prometheus_url' | 'done';

export default function AgentInitWizard({
  destination,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadAgentConfig = loadAgentConfig,
  _updateAgentConfig = updateAgentConfig,
}: AgentInitWizardProps) {
  const { exit } = useApp();

  const existing = _loadAgentConfig(destination);

  const [step, setStep] = useState<Step>('grafana_url');
  const [grafanaInputValue, setGrafanaInputValue] = useState(
    existing.grafana_url || 'https://grafana.yourdomain.com'
  );
  const [prometheusInputValue, setPrometheusInputValue] = useState(
    existing.prometheus_remote_write_url ||
      'https://prometheus.yourdomain.com/api/v1/write'
  );
  const [grafanaUrl, setGrafanaUrl] = useState('');
  const [prometheusUrl, setPrometheusUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updateAgentConfig(destination, grafanaUrl, prometheusUrl);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, grafanaUrl, prometheusUrl, destination, exit, _updateAgentConfig]);

  if (step === 'grafana_url') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Observability Agent Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Remote Grafana URL (where you view dashboards)'}</Text>
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
            value={grafanaInputValue}
            onChange={(val) => {
              setGrafanaInputValue(val);
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
              setStep('prometheus_url');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'prometheus_url') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Observability Agent Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Prometheus remote_write URL (where metrics are pushed)'}
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
            value={prometheusInputValue}
            onChange={(val) => {
              setPrometheusInputValue(val);
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
              setPrometheusUrl(trimmed);
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
        {'◇  Observability agent configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Grafana URL             '}
        {grafanaUrl}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Prometheus remote_write '}
        {prometheusUrl}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To deploy the observability agent, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox agent apply'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { AgentInitWizardProps, TextInputProps };
