import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadPostgresqlConfig,
  loadPostgresPassword,
  updatePostgresqlConfig,
  type PostgresqlConfig,
} from './postgresql-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface PostgresqlInitWizardProps {
  destination: string;
  profile?: string;
  filePath?: string;
  onComplete?: () => void;
  _TextInput?: (props: TextInputProps) => null;
  _loadPostgresqlConfig?: (
    destination: string,
    filePath?: string
  ) => PostgresqlConfig;
  _loadPostgresPassword?: (profile?: string) => string | undefined;
  _updatePostgresqlConfig?: (
    destination: string,
    config: PostgresqlConfig,
    password: string,
    profile?: string,
    filePath?: string
  ) => void;
}

type Step = 'password' | 'database' | 'port' | 'version' | 'done';

export default function PostgresqlInitWizard({
  destination,
  profile = 'default',
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadPostgresqlConfig = loadPostgresqlConfig,
  _loadPostgresPassword = loadPostgresPassword,
  _updatePostgresqlConfig = updatePostgresqlConfig,
}: PostgresqlInitWizardProps) {
  const { exit } = useApp();

  const existingConfig = _loadPostgresqlConfig(destination, filePath);

  const [step, setStep] = useState<Step>('password');
  const [inputValue, setInputValue] = useState(
    _loadPostgresPassword(profile) ?? ''
  );
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [port, setPort] = useState(0);
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updatePostgresqlConfig(
        destination,
        {
          enabled: true,
          port,
          database,
          version,
        },
        password,
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
    }
  }, [
    step,
    port,
    database,
    version,
    password,
    profile,
    destination,
    filePath,
    exit,
    onComplete,
    _updatePostgresqlConfig,
  ]);

  if (step === 'password') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  PostgreSQL — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {
            '│  Deploys PostgreSQL in a Docker container with a persistent data volume.'
          }
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {
            '◆  Admin password  (stored in credentials store, not written to config file)'
          }
        </Text>
        <Text dimColor>
          {'│  Stored in ~/.iac-toolbox/credentials — never committed.'}
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
                setError('Password must not be empty');
                return;
              }
              setPassword(trimmed);
              setInputValue(existingConfig.database);
              setError(null);
              setStep('database');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'database') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  PostgreSQL — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Admin password  ●●●●●●●●'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Database name (default: postgres)'}</Text>
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
              const trimmed = val.trim() || 'postgres';
              if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                setError(
                  'Database name must contain only letters, numbers, and underscores'
                );
                return;
              }
              setDatabase(trimmed);
              setInputValue(String(existingConfig.port));
              setError(null);
              setStep('port');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'port') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  PostgreSQL — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Admin password  ●●●●●●●●'}</Text>
        <Text dimColor>
          {'◇  Database name   '}
          {database}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Port (default: 5432)'}</Text>
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
              const trimmed = val.trim() || '5432';
              const parsed = parseInt(trimmed, 10);
              if (isNaN(parsed)) {
                setError('Port must be a number');
                return;
              }
              if (parsed < 1024 || parsed > 65535) {
                setError('Port must be between 1024 and 65535');
                return;
              }
              setPort(parsed);
              setInputValue(existingConfig.version);
              setError(null);
              setStep('version');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'version') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  PostgreSQL — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Admin password  ●●●●●●●●'}</Text>
        <Text dimColor>
          {'◇  Database name   '}
          {database}
        </Text>
        <Text dimColor>
          {'◇  Port            '}
          {port}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  PostgreSQL version (default: 16)'}</Text>
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
              const trimmed = val.trim() || '16';
              if (!trimmed) {
                setError('Version must not be empty');
                return;
              }
              setVersion(trimmed);
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
        {'◇  PostgreSQL configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  Admin password  ●●●●●●●●  → ~/.iac-toolbox/credentials'}</Text>
      <Text>
        {'│  Database name   '}
        {database}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Port            '}
        {port}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Version         '}
        {version}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Config saved. Run `iac-toolbox postgresql install` to deploy.'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { PostgresqlInitWizardProps, TextInputProps };
