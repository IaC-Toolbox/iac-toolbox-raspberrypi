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
