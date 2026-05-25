import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadGithubRunnerRepoUrl,
  loadGithubRunnerLabels,
  loadGithubRunnerToken,
  updateGithubRunnerConfig,
} from './github-runner-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface GithubRunnerInitWizardProps {
  destination: string;
  profile?: string;
  filePath?: string;
  onComplete?: () => void;
  _TextInput?: (props: TextInputProps) => null;
  _loadGithubRunnerRepoUrl?: (
    destination: string,
    filePath?: string
  ) => string | undefined;
  _loadGithubRunnerLabels?: (
    destination: string,
    filePath?: string
  ) => string | undefined;
  _loadGithubRunnerToken?: (profile?: string) => string | undefined;
  _updateGithubRunnerConfig?: (
    destination: string,
    repoUrl: string,
    token: string,
    labels: string,
    profile?: string,
    filePath?: string
  ) => void;
}

type Step = 'repo_url' | 'token' | 'labels' | 'done';

export default function GithubRunnerInitWizard({
  destination,
  profile = 'default',
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadGithubRunnerRepoUrl = loadGithubRunnerRepoUrl,
  _loadGithubRunnerLabels = loadGithubRunnerLabels,
  _loadGithubRunnerToken = loadGithubRunnerToken,
  _updateGithubRunnerConfig = updateGithubRunnerConfig,
}: GithubRunnerInitWizardProps) {
  const { exit } = useApp();

  const existingRepoUrl = _loadGithubRunnerRepoUrl(destination, filePath);
  const existingLabels = _loadGithubRunnerLabels(destination, filePath);

  const [step, setStep] = useState<Step>('repo_url');
  const [inputValue, setInputValue] = useState(existingRepoUrl ?? '');
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [labels, setLabels] = useState('');
  const [error, setError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useEffect(() => {
    if (step === 'done') {
      _updateGithubRunnerConfig(
        destination,
        repoUrl,
        token,
        labels,
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
    repoUrl,
    token,
    labels,
    profile,
    destination,
    filePath,
    exit,
    onComplete,
    _updateGithubRunnerConfig,
  ]);

  if (step === 'repo_url') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  GitHub Actions Runner — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  GitHub repository URL (e.g. https://github.com/org/repo)'}
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
                setError('Repository URL must not be empty');
                return;
              }
              if (!trimmed.startsWith('https://github.com/')) {
                setError('URL must start with https://github.com/');
                return;
              }
              setRepoUrl(trimmed);
              setInputValue(_loadGithubRunnerToken(profile) ?? '');
              setError(null);
              setStep('token');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'token') {
    const tokenHintUrl = repoUrl
      ? `${repoUrl}/settings/actions/runners/new`
      : 'https://github.com/<org>/<repo>/settings/actions/runners/new';
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  GitHub Actions Runner — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Repository: '}
          {repoUrl}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Generate a token at:'}</Text>
        <Text dimColor>
          {'│    '}
          {tokenHintUrl}
        </Text>
        <Text color="yellow">{'│  ⚠ Tokens expire after 1 hour.'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Runner registration token  (expires in 1 hour)'}</Text>
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
                setError('Token must not be empty');
                return;
              }
              setToken(trimmed);
              setInputValue(existingLabels ?? 'self-hosted');
              setError(null);
              setStep('labels');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'labels') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  GitHub Actions Runner — init'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Repository: '}
          {repoUrl}
        </Text>
        <Text dimColor>{'◇  Token:      ●●●●●●●●'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Runner labels (comma-separated, default: self-hosted)'}
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
              const trimmed = val.trim() || 'self-hosted';
              setLabels(trimmed);
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
        {'◇  GitHub Actions Runner configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Repository   '}
        {repoUrl}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Labels        '}
        {labels}
        {'  → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>{'│  Token         ●●●●●●●●  → ~/.iac-toolbox/credentials'}</Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install the runner, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox github-runner install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { GithubRunnerInitWizardProps, TextInputProps };
