import { Box, Text, useApp } from 'ink';
import RealSelectInput from 'ink-select-input';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadTargetConfig,
  updateTargetConfig,
  type TargetConfig,
} from '../utils/targetConfig.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  mask?: string;
}

interface SelectItem {
  label: string;
  value: string;
}

interface TargetInitWizardProps {
  destination: string;
  /** Injectable deps for testing */
  _SelectInput?: typeof RealSelectInput;
  _TextInput?: (props: TextInputProps) => null;
  _loadTargetConfig?: (destination: string) => TargetConfig;
  _updateTargetConfig?: (destination: string, config: TargetConfig) => void;
  _testSshConnection?: (
    host: string,
    user: string,
    sshKey: string
  ) => Promise<boolean>;
}

type Step =
  | 'mode_select'
  | 'connection_string'
  | 'ssh_key'
  | 'testing'
  | 'done'
  | 'error';

async function defaultTestSshConnection(
  host: string,
  user: string,
  sshKey: string
): Promise<boolean> {
  const { spawnSync } = await import('child_process');
  const result = spawnSync(
    'ssh',
    [
      '-i',
      sshKey,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      `${user}@${host}`,
      'echo ok',
    ],
    { encoding: 'utf-8' }
  );
  return result.status === 0;
}

const MODE_OPTIONS: SelectItem[] = [
  { label: 'localhost  (this machine)', value: 'local' },
  { label: 'remote     (SSH to another device)', value: 'remote' },
];

export default function TargetInitWizard({
  destination,
  _SelectInput = RealSelectInput,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadTargetConfig = loadTargetConfig,
  _updateTargetConfig = updateTargetConfig,
  _testSshConnection = defaultTestSshConnection,
}: TargetInitWizardProps) {
  const { exit } = useApp();

  const existingConfig = _loadTargetConfig(destination);
  const existingConnectionString =
    existingConfig.mode === 'remote' &&
    existingConfig.user &&
    existingConfig.host
      ? `${existingConfig.user}@${existingConfig.host}`
      : '';
  const existingSshKey =
    existingConfig.mode === 'remote' && existingConfig.ssh_key
      ? existingConfig.ssh_key
      : '~/.ssh/id_ed25519';

  const [step, setStep] = useState<Step>('mode_select');
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [connectionString, setConnectionString] = useState('');
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [sshKey, setSshKey] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [sshFailed, setSshFailed] = useState(false);
  const [pendingTest, setPendingTest] = useState(false);

  const InputComponent = _TextInput;
  const SelectComponent = _SelectInput;

  // Handle SSH connection test
  useEffect(() => {
    if (!pendingTest) return;
    let cancelled = false;

    const run = async () => {
      const success = await _testSshConnection(host, user, sshKey);
      if (cancelled) return;
      setTesting(false);
      setPendingTest(false);
      if (success) {
        setStep('done');
      } else {
        setSshFailed(true);
        setStep('error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pendingTest, host, user, sshKey, _testSshConnection]);

  // Save config and exit on done
  useEffect(() => {
    if (step === 'done') {
      if (mode === 'local') {
        _updateTargetConfig(destination, { mode: 'local' });
      } else {
        _updateTargetConfig(destination, {
          mode: 'remote',
          host,
          user,
          ssh_key: sshKey,
        });
      }
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, mode, host, user, sshKey, destination, exit, _updateTargetConfig]);

  const header = (
    <>
      <Text bold color="cyan">
        {'┌  IaC-Toolbox — Target Setup'}
      </Text>
      <Text bold>{'│'}</Text>
    </>
  );

  if (step === 'mode_select') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text bold>{'◆  Where do you want to install?'}</Text>
        <Box paddingLeft={3} marginTop={1}>
          <SelectComponent
            items={MODE_OPTIONS}
            onSelect={(item: SelectItem) => {
              if (item.value === 'local') {
                setMode('local');
                setStep('done');
              } else {
                setMode('remote');
                setInputValue(existingConnectionString);
                setStep('connection_string');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'connection_string') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  SSH connection string'}</Text>
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
              if (!trimmed.includes('@')) {
                setError(
                  'Invalid format — expected user@host (e.g. pi@192.168.1.50)'
                );
                return;
              }
              const atIdx = trimmed.indexOf('@');
              const parsedUser = trimmed.substring(0, atIdx).trim();
              const parsedHost = trimmed.substring(atIdx + 1).trim();
              if (!parsedUser || !parsedHost) {
                setError(
                  'Invalid format — expected user@host (e.g. pi@192.168.1.50)'
                );
                return;
              }
              setUser(parsedUser);
              setHost(parsedHost);
              setConnectionString(trimmed);
              setError(null);
              setInputValue(existingSshKey);
              setStep('ssh_key');
            }}
            placeholder="user@remote_ip"
          />
        </Box>
      </Box>
    );
  }

  if (step === 'ssh_key') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  SSH private key path'}</Text>
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
                setError('SSH key path must not be empty');
                return;
              }
              setSshKey(trimmed);
              setError(null);
              setTesting(true);
              setPendingTest(true);
              setStep('testing');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'testing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text dimColor>
          {'◇  SSH key: '}
          {sshKey}
        </Text>
        <Text bold>{'│'}</Text>
        <Text>
          {'◜  Testing SSH connection to '}
          {connectionString}
          {'...'}
        </Text>
        {testing && (
          <Text dimColor>{'│  (this may take up to 10 seconds)'}</Text>
        )}
      </Box>
    );
  }

  if (step === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text dimColor>
          {'◇  SSH key: '}
          {sshKey}
        </Text>
        <Text bold>{'│'}</Text>
        {sshFailed && (
          <>
            <Box paddingLeft={3}>
              <Text color="red">{'✗ SSH connection failed'}</Text>
            </Box>
            <Box paddingLeft={3}>
              <Text>
                {'Could not connect to '}
                {connectionString}
              </Text>
            </Box>
            <Box paddingLeft={3}>
              <Text>
                {'Check that the host is reachable and the key is correct.'}
              </Text>
            </Box>
          </>
        )}
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Retry? Press Enter to try again, or Ctrl+C to abort.'}
        </Text>
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value=""
            onChange={() => {}}
            onSubmit={() => {
              setSshFailed(false);
              setError(null);
              setTesting(true);
              setPendingTest(true);
              setStep('testing');
            }}
          />
        </Box>
      </Box>
    );
  }

  // done step
  if (mode === 'local') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="green">
          {'◇  Target configuration saved'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text>{'│  Mode    localhost'}</Text>
        <Text bold>{'│'}</Text>
        <Text>{'│  ℹ  All install commands will run on this machine.'}</Text>
        <Text>
          {'│  ℹ  Run iac-toolbox target init again to change the target.'}
        </Text>
        <Text bold>{'└'}</Text>
      </Box>
    );
  }

  // remote done
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Target configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  Mode    remote'}</Text>
      <Text>
        {'│  Host    '}
        {host}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  User    '}
        {user}
        {'              → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Key     '}
        {sshKey}
        {'  → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  ℹ  All install commands will now target '}
        {connectionString}
      </Text>
      <Text>
        {'│  ℹ  Run iac-toolbox target init again to change the target.'}
      </Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { TargetInitWizardProps, TextInputProps };
