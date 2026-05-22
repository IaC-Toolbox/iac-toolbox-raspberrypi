import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadPrometheusDomain,
  updatePrometheusConfig,
} from './prometheus-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface PrometheusInitWizardProps {
  destination: string;
  filePath?: string;
  onComplete?: () => void;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadPrometheusDomain */
  _loadDomain?: (destination: string, filePath?: string) => string | undefined;
  /** Injectable for testing — defaults to updatePrometheusConfig */
  _updatePrometheusConfig?: (
    destination: string,
    domain: string,
    filePath?: string
  ) => void;
}

type Step = 'domain' | 'done';

export default function PrometheusInitWizard({
  destination,
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadDomain = loadPrometheusDomain,
  _updatePrometheusConfig = updatePrometheusConfig,
}: PrometheusInitWizardProps) {
  const { exit } = useApp();

  const existingDomain = _loadDomain(destination, filePath);

  const [step, setStep] = useState<Step>('domain');
  const [inputValue, setInputValue] = useState(
    existingDomain || 'prometheus.iac-toolbox.com'
  );
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updatePrometheusConfig(destination, domain, filePath);
      // Give Ink time to render final screen
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
    domain,
    destination,
    filePath,
    exit,
    onComplete,
    _updatePrometheusConfig,
  ]);

  if (step === 'domain') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Prometheus Setup'}
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
