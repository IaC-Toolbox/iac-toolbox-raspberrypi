import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadPrometheusGrafanaUrl,
  loadPrometheusDomain,
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
  filePath?: string;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadPrometheusGrafanaUrl */
  _loadGrafanaUrl?: (
    destination: string,
    filePath?: string
  ) => string | undefined;
  /** Injectable for testing — defaults to loadPrometheusDomain */
  _loadDomain?: (destination: string, filePath?: string) => string | undefined;
  /** Injectable for testing — defaults to updatePrometheusConfig */
  _updatePrometheusConfig?: (
    destination: string,
    grafanaUrl: string,
    domain: string,
    filePath?: string
  ) => void;
}

type Step = 'grafana_url' | 'domain' | 'done';

export default function PrometheusInitWizard({
  destination,
  filePath,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadGrafanaUrl = loadPrometheusGrafanaUrl,
  _loadDomain = loadPrometheusDomain,
  _updatePrometheusConfig = updatePrometheusConfig,
}: PrometheusInitWizardProps) {
  const { exit } = useApp();

  const existingUrl = _loadGrafanaUrl(destination, filePath);
  const existingDomain = _loadDomain(destination, filePath);

  const [step, setStep] = useState<Step>('grafana_url');
  const [inputValue, setInputValue] = useState(
    existingUrl || 'https://grafana.iac-toolbox.com'
  );
  const [grafanaUrl, setGrafanaUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updatePrometheusConfig(destination, grafanaUrl, domain, filePath);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    grafanaUrl,
    domain,
    destination,
    filePath,
    exit,
    _updatePrometheusConfig,
  ]);

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
              setInputValue(existingDomain || 'prometheus.iac-toolbox.com');
              setError(null);
              setStep('domain');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'domain') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Prometheus Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Grafana URL: '}
          {grafanaUrl}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Prometheus public domain'}</Text>
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
                setError('Domain must not be empty');
                return;
              }
              setDomain(trimmed);
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
        {'◇  Prometheus configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Grafana URL    '}
        {grafanaUrl}
        {'    → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Domain         '}
        {domain}
        {'    → '}
        {filePath ?? 'iac-toolbox.yml'}
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
