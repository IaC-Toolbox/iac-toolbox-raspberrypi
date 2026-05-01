import { Box, Text } from 'ink';
import InkSelectInput from 'ink-select-input';
import { Colors, Symbols } from '../tokens.js';

interface SelectItem {
  label: string;
  value: string;
}

interface SelectInputProps {
  label: string;
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
}

export function SelectInput({ label, items, onSelect }: SelectInputProps) {
  return (
    <Box flexDirection="column">
      <Text color={Colors.muted}>
        {Symbols.pipe} {label}
      </Text>
      <Box>
        <InkSelectInput items={items} onSelect={onSelect} />
      </Box>
    </Box>
  );
}
