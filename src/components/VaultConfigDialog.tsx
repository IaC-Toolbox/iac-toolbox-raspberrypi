import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useState } from 'react';
import type { CloudflareConfig } from './CloudflareConfigDialog.js';

export interface VaultConfig {
  enabled: boolean;
  version: string;
  port: number;
  enableKv: boolean;
  enableAudit: boolean;
  domain: string;
}

interface VaultConfigDialogProps {
  cloudflareConfig?: CloudflareConfig | null;
  onComplete: (config: VaultConfig) => void;
}

export default function VaultConfigDialog({
  cloudflareConfig,
  onComplete,
}: VaultConfigDialogProps) {
  const [decided, setDecided] = useState(false);

  const cloudflareEnabled = cloudflareConfig?.enabled === true;
  const suggestedDomain = cloudflareEnabled
    ? `vault.${cloudflareConfig.zoneName || 'example.com'}`
    : '';

  if (!decided && !cloudflareEnabled) {
    setDecided(true);
    onComplete({
      enabled: true,
      version: 'latest',
      port: 8200,
      enableKv: true,
      enableAudit: true,
      domain: '',
    });
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Expose Vault publicly via Cloudflare?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>
            ○ Yes — not available (Cloudflare Tunnel is not enabled)
          </Text>
        </Box>
        <Box paddingLeft={3}>
          <Text>● No — local access only (http://localhost:8200)</Text>
        </Box>
      </Box>
    );
  }

  if (!decided) {
    const options = [
      { label: `Yes — use ${suggestedDomain}`, value: 'yes' },
      { label: 'No — local access only (http://localhost:8200)', value: 'no' },
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Expose Vault publicly via Cloudflare?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>Suggested domain: {suggestedDomain}</Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput
            items={options}
            onSelect={(item) => {
              const domain = item.value === 'yes' ? suggestedDomain : '';
              setDecided(true);
              onComplete({
                enabled: true,
                version: 'latest',
                port: 8200,
                enableKv: true,
                enableAudit: true,
                domain,
              });
            }}
          />
        </Box>
      </Box>
    );
  }

  return null;
}
