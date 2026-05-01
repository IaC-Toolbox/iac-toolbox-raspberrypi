import { Text } from 'ink';
import { Colors, Symbols } from '../tokens.js';

export function Divider() {
  return <Text color={Colors.muted}>{Symbols.pipe}</Text>;
}
