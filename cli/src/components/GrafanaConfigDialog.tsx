import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useState } from 'react';
import type { CloudflareConfig } from './CloudflareConfigDialog.js';

export interface GrafanaConfig {
  enabled: boolean;
  adminPassword: string;
  domain: string;
}

interface GrafanaConfigDialogProps {
  cloudflareConfig?: CloudflareConfig | null;
  onComplete: (config: GrafanaConfig) => void;
}

type Step = 'password' | 'confirm' | 'domain';

export default function GrafanaConfigDialog({
  cloudflareConfig,
  onComplete,
}: GrafanaConfigDialogProps) {
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [inputValue, setInputValue] = useState('');

  const cloudflareEnabled = cloudflareConfig?.enabled === true;
  const suggestedDomain = cloudflareEnabled
    ? `grafana.${cloudflareConfig.zoneName || 'example.com'}`
    : '';

  if (step === 'password') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Grafana admin password</Text>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(val) => {
              if (!val.trim()) return;
              setPassword(val.trim());
              setInputValue('');
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
        <Text bold>◆ Confirm password</Text>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(val) => {
              if (val.trim() !== password) {
                setInputValue('');
                setPassword('');
                setStep('password');
                return;
              }
              setInputValue('');
              setStep('domain');
            }}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  // Domain step
  if (!cloudflareEnabled) {
    onComplete({ enabled: true, adminPassword: password, domain: '' });
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Expose Grafana publicly via Cloudflare?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>
            ○ Yes — not available (Cloudflare Tunnel is not enabled)
          </Text>
        </Box>
        <Box paddingLeft={3}>
          <Text>● No — local access only (http://localhost:3000)</Text>
        </Box>
      </Box>
    );
  }

  const options = [
    { label: `Yes — use ${suggestedDomain}`, value: 'yes' },
    { label: 'No — local access only (http://localhost:3000)', value: 'no' },
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Expose Grafana publicly via Cloudflare?</Text>
      <Box paddingLeft={3}>
        <Text dimColor>Suggested domain: {suggestedDomain}</Text>
      </Box>
      <Box paddingLeft={3}>
        <SelectInput
          items={options}
          onSelect={(item) => {
            const domain = item.value === 'yes' ? suggestedDomain : '';
            onComplete({ enabled: true, adminPassword: password, domain });
          }}
        />
      </Box>
    </Box>
  );
}
