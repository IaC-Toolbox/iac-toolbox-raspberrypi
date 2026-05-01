---
status: draft
completed_date:
pr_url:
---

# iac-toolbox CLI — Terminal Design System Overview

The CLI is built on Ink (React for terminals) with TypeScript. As the wizard grows across multiple integrations and screens, ad-hoc component construction creates visual inconsistency and duplicated logic.

This design system defines a shared component library, visual language, and layout conventions that all wizard screens must follow. The reference aesthetic is Clack — clean borders, consistent symbols, progressive disclosure. All mockups in the feature docs use this visual language and this design system codifies it in code.

## File Structure

```text
src/
├── design-system/
│   ├── tokens.ts                # Colors, symbols, spacing constants
│   ├── components/
│   │   ├── Frame.tsx            # Outer wizard border and header
│   │   ├── Step.tsx             # Individual wizard step container
│   │   ├── TextInput.tsx        # Wrapped ink-text-input with label
│   │   ├── PasswordInput.tsx    # TextInput with masking
│   │   ├── SelectInput.tsx      # Wrapped ink-select-input
│   │   ├── MultiSelect.tsx      # Multi-toggle checkbox list
│   │   ├── Spinner.tsx          # Wrapped ink-spinner with label
│   │   ├── StatusLine.tsx      # ● ○ ✔ ✗ status indicators
│   │   ├── Badge.tsx           # Inline tag (coming soon, disabled)
│   │   ├── Divider.tsx         # │ separator line
│   │   ├── Alert.tsx           # ⚠ warning block
│   │   └── Summary.tsx         # Final confirmation screen layout
│   └── index.ts                 # Re-exports all components
```

## Design Tokens

### `src/design-system/tokens.ts`

```ts
export const Colors = {
  primary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  muted: 'gray',
  highlight: 'white',
} as const;

export const Symbols = {
  // Step states
  active: ' ◆ ',
  completed: ' ◇ ',
  pending: ' ○ ',

  // Status indicators
  success: ' ● ',
  done: ' ✔ ',
  fail: ' ✗ ',
  empty: ' ○ ',

  // Selection states
  selected: ' ◉ ',
  unselected: ' ◯ ',
  disabled: ' ○ ',

  // Decorative
  pipe: ' │ ',
  corner: ' └ ',
  topCorner: ' ┌ ',
  warning: ' ⚠ ',
  info: ' ℹ ',
  spinner: [' ◜ ', ' ◠ ', ' ◝ ', ' ◞ ', ' ◡ ', ' ◟ '],
} as const;

export const Spacing = {
  indent: '  ', // 2 spaces — all content inside a step
  gap: 1, // Box gap between steps
} as const;
```

## Components

### Frame

Wraps the entire wizard. Renders the top border and app title. Used once at the root level.

```tsx
<Frame title="Iac-Toolbox Setup" />
```

Renders:

```text
┌ Iac-Toolbox Setup
│
```

### Step

The core layout unit. Every wizard screen is a Step. Handles active, completed, and pending states automatically.

```tsx
// src/design-system/components/Step.tsx
import { Box, Text } from 'ink';
import { Colors, Symbols } from '../tokens.js';

type StepState = 'active' | 'completed' | 'pending';

interface StepProps {
  label: string;
  state: StepState;
  value?: string;
  hint?: string; // shown below label in muted color
  children?: React.ReactNode;
}

export function Step({ label, state, value, hint, children }: StepProps) {
  const symbol = state === 'completed' ? Symbols.completed : state === 'active' ? Symbols.active : Symbols.pending;
  const labelColor = state === 'active' ? Colors.highlight : Colors.muted;

  return (
    <Box flexDirection="column">
      <Text color={labelColor}>{symbol} {label}</Text>
      {hint && <Text color={Colors.muted}>{Symbols.pipe} {hint}</Text>}
      {state === 'completed' && value && (
        <Text color={Colors.muted}>{Symbols.pipe} {value}</Text>
      )}
      {state === 'active' && children && (
        <Box flexDirection="column" paddingLeft={0}>
          {children}
        </Box>
      )}
    </Box>
  );
}
```

Usage:

```tsx
<Step label="Choose device type" state="active">
  {/* content */}
</Step>

<Step label="Choose device type" state="completed" value="Raspberry Pi ARM64" />
```

Renders:

```text
◆ Choose device type
│ ...children
```

Completed step:

```text
◇ Choose device type
│ Raspberry Pi ARM64
```

### TextInput

Wraps `ink-text-input` with a consistent label and pipe decoration.

### PasswordInput

`TextInput` with masking.

### SelectInput

Wraps `ink-select-input`.

### MultiSelect

Multi-toggle checkbox list.

### Spinner

Wrapped `ink-spinner` with a label.

### StatusLine

Renders `● ○ ✔ ✗` status indicators.

### Badge

Inline tag for states like `coming soon` or `disabled`.

### Divider

Pipe separator line.

### Alert

Warning block with `⚠` styling.

### Summary

Final confirmation screen layout.

## Visual Language Rules

- Use clean borders and consistent pipe alignment
- Prefer progressive disclosure over crowded screens
- Keep labels short and scannable
- Use muted text for hints and completed values
- Use badges for non-interactive states like coming soon
- Keep selection markers visually distinct from status markers

## Why This Exists

Without a shared design system, each new wizard screen tends to invent its own little dialect. This file makes the terminal UI behave like one coherent product instead of a pile of unrelated prompts.
