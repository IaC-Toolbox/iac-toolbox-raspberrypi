import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { Colors } from '../tokens.js';

interface SpinnerProps {
  label: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <Box>
      <Text color={Colors.primary}>
        <InkSpinner type="dots" />
      </Text>
      <Text> {label}</Text>
    </Box>
  );
}
