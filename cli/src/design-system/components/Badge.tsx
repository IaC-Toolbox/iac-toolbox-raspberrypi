import { Text } from 'ink';

interface BadgeProps {
  label: string;
}

export function Badge({ label }: BadgeProps) {
  return <Text dimColor>[{label}]</Text>;
}
