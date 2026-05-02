import { Box, Text } from 'ink';
import { Colors, Symbols } from '../tokens.js';

interface SummaryItem {
  label: string;
  value: string;
}

interface SummaryProps {
  title: string;
  items: SummaryItem[];
}

export function Summary({ title, items }: SummaryProps) {
  return (
    <Box flexDirection="column">
      <Text color={Colors.highlight}>
        {Symbols.topCorner} {title}
      </Text>
      {items.map((item) => (
        <Text key={item.label} color={Colors.muted}>
          {Symbols.pipe} {item.label}:{' '}
          <Text color={Colors.highlight}>{item.value}</Text>
        </Text>
      ))}
      <Text color={Colors.muted}>{Symbols.corner}</Text>
    </Box>
  );
}
