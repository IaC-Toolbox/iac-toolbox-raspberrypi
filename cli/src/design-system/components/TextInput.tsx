import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';
import { Colors, Symbols } from '../tokens.js';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
}: TextInputProps) {
  return (
    <Box flexDirection="column">
      <Text color={Colors.muted}>
        {Symbols.pipe} {label}
      </Text>
      <Box>
        <InkTextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}
