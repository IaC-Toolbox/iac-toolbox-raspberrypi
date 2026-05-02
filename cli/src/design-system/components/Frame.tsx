import { Box, Text } from 'ink';
import { Symbols } from '../tokens.js';

interface FrameProps {
  title: string;
}

export function Frame({ title }: FrameProps) {
  return (
    <Box flexDirection="column">
      <Text>
        {Symbols.topCorner}
        {title}
      </Text>
      <Text>{Symbols.pipe}</Text>
    </Box>
  );
}
