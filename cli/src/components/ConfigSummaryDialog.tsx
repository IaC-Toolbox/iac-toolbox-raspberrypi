import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface ServiceSummary {
  [key: string]: { enabled: boolean; details?: string };
}

interface ConfigSummaryProps {
  services: ServiceSummary;
  onProceed: (action: 'install' | 'save' | 'back') => void;
}

interface SelectOption {
  label: string;
  value: string;
}

export default function ConfigSummaryDialog({
  services,
  onProceed,
}: ConfigSummaryProps) {
  const options: SelectOption[] = [
    { label: 'Yes, run installation now', value: 'install' },
    { label: 'Save config only (run later)', value: 'save' },
    { label: 'Go back and edit', value: 'back' },
  ];

  const handleSelect = (item: SelectOption) => {
    onProceed(item.value as 'install' | 'save' | 'back');
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Configuration Summary</Text>
      <Box paddingLeft={3} flexDirection="column" marginTop={1}>
        <Text bold>Services:</Text>
        {Object.entries(services).map(([name, config]) => (
          <Text key={name}>
            {config.enabled ? '✓' : '✗'} {name}
            {config.details ? ` (${config.details})` : ''}
          </Text>
        ))}
      </Box>
      <Box paddingTop={2}>
        <Text bold>◆ Proceed with installation?</Text>
      </Box>
      <Box paddingLeft={3}>
        <SelectInput items={options} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

export type { ServiceSummary };
