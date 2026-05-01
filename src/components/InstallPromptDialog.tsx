import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface InstallPromptDialogProps {
  onSelect: (install: boolean) => void;
}

interface SelectOption {
  label: string;
  value: string;
}

/**
 * Prompt shown after config files are written, asking whether to run
 * the install script immediately or defer to manual execution.
 */
export default function InstallPromptDialog({
  onSelect,
}: InstallPromptDialogProps) {
  const options: SelectOption[] = [
    { label: 'Yes \u2014 run install script', value: 'yes' },
    { label: 'No \u2014 I will run it manually later', value: 'no' },
  ];

  const handleSelect = (item: SelectOption) => {
    onSelect(item.value === 'yes');
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇ Configuration saved'}
      </Text>
      <Text>{'│'}</Text>
      <Text bold>{'◆ Install now?'}</Text>
      <Box paddingLeft={3}>
        <SelectInput items={options} onSelect={handleSelect} />
      </Box>
      <Text>{'└'}</Text>
    </Box>
  );
}
