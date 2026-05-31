import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadTailscaleConfig,
  loadTailscaleAuthKey,
  updateTailscaleConfig,
} from './tailscale-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface TailscaleInitWizardProps {
  destination: string;
  profile?: string;
  filePath?: string;
  onComplete?: () => void;
  _TextInput?: (props: TextInputProps) => null;
  _loadTailscaleConfig?: (
    destination: string,
    filePath?: string
  ) => { enabled?: boolean; hostname?: string } | undefined;
  _loadTailscaleAuthKey?: (profile?: string) => string | undefined;
  _updateTailscaleConfig?: (
    destination: string,
    options: { authKey: string; hostname: string },
    profile?: string,
    filePath?: string
  ) => void;
}

type Step = 'auth_key' | 'hostname' | 'done';

export default function TailscaleInitWizard({
  destination,
  profile = 'default',
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadTailscaleConfig = loadTailscaleConfig,
  _loadTailscaleAuthKey = loadTailscaleAuthKey,
  _updateTailscaleConfig = updateTailscaleConfig,
}: TailscaleInitWizardProps) {
  const { exit } = useApp();

  const existingConfig = _loadTailscaleConfig(destination, filePath);
  const existingHostname = existingConfig?.hostname ?? '';

  const [step, setStep] = useState<Step>('auth_key');
  const [inputValue, setInputValue] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [hostname, setHostname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  // Silence unused variable warning — kept for parity with other wizards
  void _loadTailscaleAuthKey;

  // Save config and exit when done
  useEffect(() => {
    if (step !== 'done') return;

    _updateTailscaleConfig(
      destination,
      { authKey, hostname },
      profile,
      filePath
    );
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        exit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [
    step,
    authKey,
    hostname,
    profile,
    destination,
    filePath,
    exit,
    onComplete,
    _updateTailscaleConfig,
  ]);

  if (step === 'auth_key') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  Tailscale — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'│  Tailscale connects your devices on a private network (tailnet).'}
        </Text>
        <Text dimColor>
          {
            '│  Generate an auth key at: https://login.tailscale.com/admin/settings/keys'
          }
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Auth key  (one-time or reusable, stored encrypted)'}
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
            mask="*"
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Auth key must not be empty');
                return;
              }
              setAuthKey(trimmed);
              setInputValue(existingHostname);
              setError(null);
              setStep('hostname');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'hostname') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  Tailscale — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Auth key:  ●●●●●●●●'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {
            '◇  Device hostname in tailnet (optional — leave blank to use system hostname)'
          }
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
              if (trimmed && /\s/.test(trimmed)) {
                setError('Hostname must not contain spaces');
                return;
              }
              setHostname(trimmed);
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
        {'◇  Tailscale configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  Auth key   ●●●●●●●●  → ~/.iac-toolbox/credentials'}</Text>
      <Text>
        {'│  Hostname   '}
        {hostname || '(system default)'}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox tailscale install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { TailscaleInitWizardProps, TextInputProps };
