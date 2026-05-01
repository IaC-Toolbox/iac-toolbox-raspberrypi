import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import { loadCredentials, saveCredentials } from '../utils/credentials.js';
import { updateGrafanaConfig } from '../utils/grafanaConfig.js';

interface GrafanaInitWizardProps {
  profile: string;
  destination: string;
}

type Step = 'username' | 'password' | 'confirm' | 'done';

export default function GrafanaInitWizard({
  profile,
  destination,
}: GrafanaInitWizardProps) {
  const { exit } = useApp();
  const creds = loadCredentials(profile);

  const [step, setStep] = useState<Step>('username');
  const [inputValue, setInputValue] = useState(
    creds.grafana_admin_user || 'admin'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'done') {
      // Save credentials and config, then exit
      saveCredentials(
        {
          grafana_admin_password: password,
          grafana_admin_user: username,
        },
        profile
      );
      updateGrafanaConfig(destination, username);
      // Give Ink time to render final screen
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, password, username, profile, destination, exit]);

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
          <TextInput
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
              setInputValue('');
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
          <TextInput
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
              setStep('confirm');
            }}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (step === 'confirm') {
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
        <Text dimColor>
          {'◇  Grafana admin password: '}
          {'********'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Confirm password'}</Text>
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
          <TextInput
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (trimmed !== password) {
                setError('Passwords do not match — try again');
                setInputValue('');
                setPassword('');
                setStep('password');
                return;
              }
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
        {'           → iac-toolbox.yml'}
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
