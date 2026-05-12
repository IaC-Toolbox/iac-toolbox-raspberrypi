import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import { loadCredentials, saveCredentials } from '../utils/credentials.js';
import { updateGrafanaConfig } from '../utils/grafanaConfig.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface GrafanaInitWizardProps {
  profile: string;
  destination: string;
  filePath?: string;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing — defaults to loadCredentials */
  _loadCredentials?: (profile: string) => Record<string, string>;
  /** Injectable for testing — defaults to saveCredentials */
  _saveCredentials?: (
    credentials: Record<string, string>,
    profile: string
  ) => void;
  /** Injectable for testing — defaults to updateGrafanaConfig */
  _updateGrafanaConfig?: (
    destination: string,
    adminUser: string,
    filePath?: string
  ) => void;
}

type Step = 'username' | 'password' | 'done';

export default function GrafanaInitWizard({
  profile,
  destination,
  filePath,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadCredentials = loadCredentials,
  _saveCredentials = saveCredentials,
  _updateGrafanaConfig = updateGrafanaConfig,
}: GrafanaInitWizardProps) {
  const { exit } = useApp();
  const creds = _loadCredentials(profile);

  const existingPassword = creds.grafana_admin_password || '';

  const [step, setStep] = useState<Step>('username');
  const [inputValue, setInputValue] = useState(
    creds.grafana_admin_user || 'admin'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      // Save credentials and config, then exit
      _saveCredentials(
        {
          grafana_admin_password: password,
          grafana_admin_user: username,
        },
        profile
      );
      _updateGrafanaConfig(destination, username, filePath);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    password,
    username,
    profile,
    destination,
    filePath,
    exit,
    _saveCredentials,
    _updateGrafanaConfig,
  ]);

  if (step === 'username') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Grafana admin username'}</Text>
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
                setError('Username must not be empty');
                return;
              }
              setUsername(trimmed);
              setInputValue(existingPassword);
              setError(null);
              setStep('password');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'password') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Grafana admin username: '}
          {username}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Grafana admin password'}</Text>
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
                setError('Password must not be empty');
                return;
              }
              setPassword(trimmed);
              setInputValue('');
              setError(null);
              setStep('done');
            }}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Grafana credentials saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Username    '}
        {username}
        {'           → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Password    ************    → ~/.iac-toolbox/credentials'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install Grafana, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox grafana install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { GrafanaInitWizardProps, TextInputProps };
