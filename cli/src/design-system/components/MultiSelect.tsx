import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { Colors, Symbols } from '../tokens.js';

interface MultiSelectItem {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label: string;
  items: MultiSelectItem[];
  onSubmit: (selected: MultiSelectItem[]) => void;
}

export function MultiSelect({ label, items, onSubmit }: MultiSelectProps) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setCursor((prev) => Math.min(items.length - 1, prev + 1));
    } else if (input === ' ') {
      const value = items[cursor]?.value;
      if (value !== undefined) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
          return next;
        });
      }
    } else if (key.return) {
      onSubmit(items.filter((item) => selected.has(item.value)));
    }
  });

  return (
    <Box flexDirection="column">
      <Text color={Colors.muted}>
        {Symbols.pipe} {label}
      </Text>
      {items.map((item, index) => {
        const isSelected = selected.has(item.value);
        const isFocused = index === cursor;
        const symbol = isSelected ? Symbols.selected : Symbols.unselected;
        return (
          <Text
            key={item.value}
            color={isFocused ? Colors.highlight : Colors.muted}
          >
            {symbol} {item.label}
          </Text>
        );
      })}
    </Box>
  );
}
