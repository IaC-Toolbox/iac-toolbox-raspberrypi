import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';
import { Colors, Symbols } from '../tokens.js';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export function PasswordInput({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
}: PasswordInputProps) {
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
          mask="*"
        />
      </Box>
    </Box>
  );
}
