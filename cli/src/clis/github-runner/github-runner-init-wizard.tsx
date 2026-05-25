import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadGithubRunnerRepoUrl,
  loadGithubRunnerLabels,
  loadGithubRunnerPat,
  setGithubRunnerPat,
  updateGithubRunnerConfig,
  validateGithubPat,
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
  _loadGithubRunnerPat?: (profile?: string) => string | undefined;
  _setGithubRunnerPat?: (pat: string, profile?: string) => void;
  _updateGithubRunnerConfig?: (
    destination: string,
    repoUrl: string,
    labels: string,
    profile?: string,
    filePath?: string
  ) => void;
  _validateGithubPat?: (repoUrl: string, pat: string) => Promise<void>;
}

type Step = 'repo_url' | 'pat' | 'pat_validating' | 'labels' | 'done';

export default function GithubRunnerInitWizard({
  destination,
  profile = 'default',
  filePath,
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadGithubRunnerRepoUrl = loadGithubRunnerRepoUrl,
  _loadGithubRunnerLabels = loadGithubRunnerLabels,
  _loadGithubRunnerPat = loadGithubRunnerPat,
  _setGithubRunnerPat = setGithubRunnerPat,
  _updateGithubRunnerConfig = updateGithubRunnerConfig,
  _validateGithubPat = validateGithubPat,
}: GithubRunnerInitWizardProps) {
  const { exit } = useApp();

  const existingRepoUrl = _loadGithubRunnerRepoUrl(destination, filePath);
  const existingLabels = _loadGithubRunnerLabels(destination, filePath);

  const [step, setStep] = useState<Step>('repo_url');
  const [inputValue, setInputValue] = useState(existingRepoUrl ?? '');
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [labels, setLabels] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [patValidating, setPatValidating] = useState(false);
  const [patVerified, setPatVerified] = useState(false);

  const InputComponent = _TextInput;

  // PAT validation effect — runs when step becomes 'pat_validating'
  useEffect(() => {
    if (step !== 'pat_validating') return;

    let cancelled = false;
    setPatValidating(true);
    setPatVerified(false);

    _validateGithubPat(repoUrl, pat)
      .then(() => {
        if (cancelled) return;
        setPatValidating(false);
        setPatVerified(true);
        // Short delay to show the success message before advancing
        setTimeout(() => {
          if (cancelled) return;
          setInputValue(existingLabels ?? 'self-hosted');
          setStep('labels');
        }, 800);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPatValidating(false);
        setPatVerified(false);
        setError(err instanceof Error ? err.message : 'PAT validation failed');
        setInputValue('');
        setStep('pat');
      });

    return () => {
      cancelled = true;
    };
  }, [step, repoUrl, pat, existingLabels, _validateGithubPat]);

  // Done effect — saves config and exits
  useEffect(() => {
    if (step === 'done') {
      _setGithubRunnerPat(pat, profile);
      _updateGithubRunnerConfig(
        destination,
        repoUrl,
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
    pat,
    labels,
    profile,
    destination,
    filePath,
    exit,
    onComplete,
    _setGithubRunnerPat,
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
              setInputValue(
                _loadGithubRunnerPat(profile) ? '(existing PAT)' : ''
              );
              setError(null);
              setStep('pat');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'pat' || step === 'pat_validating') {
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
        <Text bold>{'◆  GitHub Personal Access Token'}</Text>
        <Text dimColor>
          {
            '│    Required scopes: repo (classic) or Administration read/write (fine-grained)'
          }
        </Text>
        <Text dimColor>
          {'│    Generate at: https://github.com/settings/tokens'}
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
        {step === 'pat_validating' && patValidating && (
          <Box paddingLeft={3}>
            <Text color="yellow">
              {'◜ Verifying PAT against GitHub API...'}
            </Text>
          </Box>
        )}
        {step === 'pat_validating' && patVerified && (
          <Box paddingLeft={3}>
            <Text color="green">
              {
                '✔ PAT verified — token will be generated automatically at install time.'
              }
            </Text>
          </Box>
        )}
        {step === 'pat' && (
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
                  setError('PAT must not be empty');
                  return;
                }
                setPat(trimmed);
                setInputValue('');
                setError(null);
                setStep('pat_validating');
              }}
            />
          </Box>
        )}
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
        <Text dimColor>{'◇  PAT:        ●●●●●●●●  (verified)'}</Text>
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
      <Text>{'│  PAT           ●●●●●●●●  → ~/.iac-toolbox/credentials'}</Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'└  Config saved. Run `iac-toolbox github-runner install` —'}
      </Text>
      <Text>
        {
          '   a fresh registration token will be generated automatically each time.'
        }
      </Text>
    </Box>
  );
}

export type { GithubRunnerInitWizardProps, TextInputProps };
