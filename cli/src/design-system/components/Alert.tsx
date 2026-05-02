import { Text } from 'ink';
import { Colors, Symbols } from '../tokens.js';

interface AlertProps {
  message: string;
}

export function Alert({ message }: AlertProps) {
  return (
    <Text color={Colors.warning}>
      {Symbols.warning} {message}
    </Text>
  );
}
