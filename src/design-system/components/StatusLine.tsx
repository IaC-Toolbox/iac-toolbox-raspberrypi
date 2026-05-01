import { Text } from 'ink';
import { Colors, Symbols } from '../tokens.js';

type Status = 'success' | 'done' | 'fail' | 'empty';

interface StatusLineProps {
  status: Status;
  message: string;
}

export function StatusLine({ status, message }: StatusLineProps) {
  const symbolMap: Record<Status, string> = {
    success: Symbols.success,
    done: Symbols.done,
    fail: Symbols.fail,
    empty: Symbols.empty,
  };

  const colorMap: Record<Status, string> = {
    success: Colors.success,
    done: Colors.success,
    fail: Colors.error,
    empty: Colors.muted,
  };

  return (
    <Text color={colorMap[status]}>
      {symbolMap[status]} {message}
    </Text>
  );
}
