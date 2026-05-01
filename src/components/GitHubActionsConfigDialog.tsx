import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useState } from 'react';

interface GitHubActionsConfig {
  enabled: boolean;
  repoUrl?: string;
  runnerToken?: string;
  version?: string;
  labels?: string;
  generateWorkflow?: boolean;
  workflowPath?: string;
}

interface GitHubActionsConfigDialogProps {
  existingConfig?: Partial<GitHubActionsConfig>;
  onComplete: (config: GitHubActionsConfig) => void;
}

type Step =
  | 'enable'
  | 'repoUrl'
  | 'token'
  | 'version'
  | 'labels'
  | 'workflow'
  | 'path';

interface SelectOption {
  label: string;
  value: string;
}

export default function GitHubActionsConfigDialog({
  existingConfig,
  onComplete,
}: GitHubActionsConfigDialogProps) {
  const [step, setStep] = useState<Step>('enable');
  const [repoUrl, setRepoUrl] = useState(existingConfig?.repoUrl || '');
  const [runnerToken, setRunnerToken] = useState(
    existingConfig?.runnerToken || ''
  );
  const [version, setVersion] = useState(existingConfig?.version || '2.333.0');
  const [labels, setLabels] = useState(
    existingConfig?.labels || 'rpi,arm64,docker'
  );
  const [inputValue, setInputValue] = useState('');

  if (step === 'enable') {
    const options: SelectOption[] = [
      { label: 'Yes', value: 'yes' },
      { label: 'Skip', value: 'skip' },
    ];

    const handleSelect = (item: SelectOption) => {
      if (item.value === 'skip') {
        onComplete({ enabled: false });
      } else {
        setStep('repoUrl');
      }
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Install GitHub Actions self-hosted runner?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Recommended for ARM64 CI/CD pipelines)</Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput items={options} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  if (step === 'repoUrl') {
    const handleSubmit = (value: string) => {
      const finalUrl = value.trim() || repoUrl;
      setRepoUrl(finalUrl);
      setInputValue('');
      setStep('token');
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter GitHub repository URL</Text>
        <Box paddingLeft={3}>
          <Text dimColor>
            (Current: {repoUrl || 'not set'} - press Enter to keep)
          </Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'token') {
    const handleSubmit = (value: string) => {
      const finalToken = value.trim() || runnerToken;
      setRunnerToken(finalToken);
      setInputValue('');
      setStep('version');
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter GitHub runner token</Text>
        <Box paddingLeft={3}>
          <Text dimColor>
            (Current: {runnerToken ? '***hidden***' : 'not set'} - press Enter
            to keep)
          </Text>
        </Box>
        <Box paddingLeft={3}>
          <Text dimColor>
            (Get from: Repo &gt; Settings &gt; Actions &gt; Runners &gt; New
            runner)
          </Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (step === 'version') {
    const handleSubmit = (value: string) => {
      const finalVersion = value.trim() || version;
      setVersion(finalVersion);
      setInputValue('');
      setStep('labels');
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Runner version</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {version} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'labels') {
    const handleSubmit = (value: string) => {
      const finalLabels = value.trim() || labels;
      setLabels(finalLabels);
      setInputValue('');
      setStep('workflow');
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Runner labels (comma-separated)</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {labels} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'workflow') {
    const options: SelectOption[] = [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ];

    const handleSelect = (item: SelectOption) => {
      if (item.value === 'no') {
        onComplete({
          enabled: true,
          repoUrl,
          runnerToken,
          version,
          labels,
          generateWorkflow: false,
        });
      } else {
        onComplete({
          enabled: true,
          repoUrl,
          runnerToken,
          version,
          labels,
          generateWorkflow: true,
          workflowPath: '.github/workflows/ci.yml',
        });
      }
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Generate GitHub Actions workflow?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Creates .github/workflows/ci.yml in your repo)</Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput items={options} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  return null;
}

export type { GitHubActionsConfig };
