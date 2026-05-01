import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export interface SelectOption {
  label: string;
  value: string;
  isDisabled?: boolean;
}

interface SelectDialogProps {
  title: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
}

/**
 * Reusable selection dialog component with keyboard navigation.
 *
 * Navigation:
 * - Up/Down arrows: Navigate options
 * - Enter: Select current option
 *
 * @param title - Dialog title to display
 * @param options - Array of options with label, value, and optional isDisabled
 * @param onSelect - Callback when option is selected
 */
export default function SelectDialog({
  title,
  options,
  onSelect,
}: SelectDialogProps) {
  const handleSelect = (item: SelectOption) => {
    if (!item.isDisabled) {
      onSelect(item.value);
    }
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ {title}</Text>
      <Box paddingLeft={3} flexDirection="column">
        <SelectInput items={options} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}
