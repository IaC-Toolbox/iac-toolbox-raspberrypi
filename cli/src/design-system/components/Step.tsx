import { Box, Text } from 'ink';
import React from 'react';
import { Colors, Symbols } from '../tokens.js';

type StepState = 'active' | 'completed' | 'pending';

interface StepProps {
  label: string;
  state: StepState;
  value?: string;
  hint?: string;
  children?: React.ReactNode;
}

export function Step({ label, state, value, hint, children }: StepProps) {
  const symbol =
    state === 'completed'
      ? Symbols.completed
      : state === 'active'
        ? Symbols.active
        : Symbols.pending;
  const labelColor = state === 'active' ? Colors.highlight : Colors.muted;

  return (
    <Box flexDirection="column">
      <Text color={labelColor}>
        {symbol} {label}
      </Text>
      {hint && (
        <Text color={Colors.muted}>
          {Symbols.pipe} {hint}
        </Text>
      )}
      {state === 'completed' && value && (
        <Text color={Colors.muted}>
          {Symbols.pipe} {value}
        </Text>
      )}
      {state === 'active' && children && (
        <Box flexDirection="column" paddingLeft={0}>
          {children}
        </Box>
      )}
    </Box>
  );
}
