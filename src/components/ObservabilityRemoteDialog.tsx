import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useState } from 'react';

export interface ObservabilityRemoteConfig {
  remote: boolean;
  prometheusHost: string;
  prometheusPort: number;
  lokiHost: string;
  lokiPort: number;
}

interface ObservabilityRemoteDialogProps {
  onComplete: (config: ObservabilityRemoteConfig | null) => void;
}

type Step = 'ask' | 'host' | 'prometheusPort' | 'lokiPort';

export default function ObservabilityRemoteDialog({
  onComplete,
}: ObservabilityRemoteDialogProps) {
  const [step, setStep] = useState<Step>('ask');
  const [host, setHost] = useState('');
  const [inputValue, setInputValue] = useState('');

  if (step === 'ask') {
    const options = [
      {
        label: 'Yes — connect to an existing iac-toolbox DevOps server',
        value: 'yes',
      },
      { label: 'No — skip observability on this device', value: 'no' },
    ];
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Ship metrics and logs to a DevOps server?</Text>
        <Box paddingLeft={3}>
          <SelectInput
            items={options}
            onSelect={(item) => {
              if (item.value === 'no') {
                onComplete(null);
              } else {
                setStep('host');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'host') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ DevOps server address</Text>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(val) => {
              if (!val.trim()) return;
              setHost(val.trim());
              setInputValue('9090');
              setStep('prometheusPort');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'prometheusPort') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Prometheus port</Text>
        <Box paddingLeft={3}>
          <Text dimColor>Default: 9090</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              setInputValue('3100');
              setStep('lokiPort');
            }}
          />
        </Box>
      </Box>
    );
  }

  // lokiPort
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Loki port</Text>
      <Box paddingLeft={3}>
        <Text dimColor>Default: 3100</Text>
      </Box>
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(val) => {
            const promPort = parseInt(inputValue || '9090', 10) || 9090;
            const lPort = parseInt(val || '3100', 10) || 3100;
            onComplete({
              remote: true,
              prometheusHost: host,
              prometheusPort: promPort,
              lokiHost: host,
              lokiPort: lPort,
            });
          }}
        />
      </Box>
    </Box>
  );
}
