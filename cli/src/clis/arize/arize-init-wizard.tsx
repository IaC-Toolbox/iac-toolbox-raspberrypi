import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadArizeUiPort,
  loadArizeVersion,
  updateArizeConfig,
} from './arize-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface ArizeInitWizardProps {
  destination: string;
  filePath?: string;
  onComplete?: () => void;
  _TextInput?: (props: TextInputProps) => null;
  _loadArizeUiPort?: (
    destination: string,
    filePath?: string
  ) => number | undefined;
  _loadArizeVersion?: (
    destination: string,
    filePath?: string
  ) => string | undefined;
  _updateArizeConfig?: (
    destination: string,
    uiPort: number,
    version: string,
    filePath?: string
  ) => void;
}

type Step = 'version' | 'ui_port' | 'done';

export default function ArizeInitWizard({
  destination,
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadArizeUiPort = loadArizeUiPort,
  _loadArizeVersion = loadArizeVersion,
  _updateArizeConfig = updateArizeConfig,
}: ArizeInitWizardProps) {
  const { exit } = useApp();

  const existingVersion = _loadArizeVersion(destination, filePath);
  const existingPort = _loadArizeUiPort(destination, filePath);

  const [step, setStep] = useState<Step>('version');
  const [inputValue, setInputValue] = useState(existingVersion ?? 'latest');
  const [version, setVersion] = useState('');
  const [uiPort, setUiPort] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updateArizeConfig(destination, uiPort, version, filePath);
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
    uiPort,
    version,
    destination,
    filePath,
    exit,
    onComplete,
    _updateArizeConfig,
  ]);

  if (step === 'version') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Arize Phoenix Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Phoenix image version (e.g. latest, 4.0.0)'}</Text>
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
                setError('Version must not be empty');
                return;
              }
              setVersion(trimmed);
              setInputValue(String(existingPort ?? 6006));
              setError(null);
              setStep('ui_port');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'ui_port') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Arize Phoenix Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Version: '}
          {version}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Phoenix UI port'}</Text>
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
              const parsed = parseInt(trimmed, 10);
              if (!trimmed || isNaN(parsed)) {
                setError('Port must be a number');
                return;
              }
              if (parsed < 1 || parsed > 65535) {
                setError('Port must be between 1 and 65535');
                return;
              }
              setUiPort(parsed);
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
        {'◇  Arize Phoenix configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Version           '}
        {version}
        {'    → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  UI port           '}
        {uiPort}
        {'   → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>{'│  DB                sqlite'}</Text>
      <Text>{'│  Domain            arize.iac-toolbox.com'}</Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install Arize Phoenix, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox arize install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { ArizeInitWizardProps, TextInputProps };
