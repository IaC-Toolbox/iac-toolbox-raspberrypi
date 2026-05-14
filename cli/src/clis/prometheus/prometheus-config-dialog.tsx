import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useState } from 'react';

interface PrometheusConfig {
  enabled: boolean;
  retentionDays?: number;
  scrapeInterval?: string;
}

interface PrometheusConfigDialogProps {
  existingConfig?: Partial<PrometheusConfig>;
  onComplete: (config: PrometheusConfig) => void;
}

type Step = 'enable' | 'retention' | 'scrapeInterval';

interface SelectOption {
  label: string;
  value: string;
}

export default function PrometheusConfigDialog({
  existingConfig,
  onComplete,
}: PrometheusConfigDialogProps) {
  const [step, setStep] = useState<Step>('enable');
  const [retentionDays, setRetentionDays] = useState(
    existingConfig?.retentionDays || 15
  );
  const [scrapeInterval, setScrapeInterval] = useState(
    existingConfig?.scrapeInterval || '15s'
  );
  const [inputValue, setInputValue] = useState('');

  if (step === 'enable') {
    const options: SelectOption[] = [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ];

    const handleSelect = (item: SelectOption) => {
      if (item.value === 'yes') {
        setStep('retention');
      } else {
        onComplete({ enabled: false });
      }
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Install Prometheus?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Metrics collection)</Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput items={options} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  if (step === 'retention') {
    const options: SelectOption[] = [
      { label: '7 days', value: '7' },
      { label: '15 days (recommended)', value: '15' },
      { label: '30 days', value: '30' },
    ];

    const handleSelect = (item: SelectOption) => {
      setRetentionDays(parseInt(item.value, 10));
      setStep('scrapeInterval');
    };

    const initialIndex = retentionDays === 7 ? 0 : retentionDays === 15 ? 1 : 2;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Metrics retention period</Text>
        <Box paddingLeft={3}>
          <SelectInput
            items={options}
            onSelect={handleSelect}
            initialIndex={initialIndex}
          />
        </Box>
      </Box>
    );
  }

  const handleScrapeSubmit = (value: string) => {
    const finalInterval = value.trim() || scrapeInterval;
    setScrapeInterval(finalInterval);
    onComplete({
      enabled: true,
      retentionDays,
      scrapeInterval: finalInterval,
    });
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Scrape interval</Text>
      <Box paddingLeft={3}>
        <Text dimColor>(Default: {scrapeInterval})</Text>
      </Box>
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleScrapeSubmit}
        />
      </Box>
    </Box>
  );
}

export type { PrometheusConfig };
