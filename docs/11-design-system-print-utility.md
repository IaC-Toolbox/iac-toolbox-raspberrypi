# Design System Print Utility

## Problem

The action files (`grafanaInstall.ts`, `prometheusInstall.ts`, `metricsAgentInstall.ts`,
`cloudflareInstall.ts`, `cadvisorInstall.ts`, `applyInstall.ts`) and utils
(`applySummary.ts`, `standaloneInstall.ts`, `filePathInstall.ts`) output terminal
messages using raw `console.log` with symbol strings hardcoded inline:

```typescript
console.log('◆  Installing Grafana...');
console.log('│  ✔ Credentials loaded');
console.error('│  ✗ Ansible playbook exited with errors');
```

These duplicate — as literal strings — the symbols already defined in
`cli/src/design-system/tokens.ts` (`Symbols.active`, `Symbols.done`, `Symbols.fail`,
`Symbols.pipe`, `Symbols.corner`). There are ~287 such calls across 11 files.

The design system's React/Ink components (`Alert`, `Summary`, `Spinner`, etc.)
cannot be used in these files because they run outside a React render tree — they
are imperative async functions, not components.

---

## What Will Be Implemented

A thin `cli/src/utils/print.ts` utility that:

1. **Imports tokens from the design system** — `Symbols` and `Colors` from
   `cli/src/design-system/tokens.ts`. No duplication.
2. **Provides named print functions** that encapsulate the recurring output
   patterns seen across all action files.
3. **Adds chalk** as an explicit direct dependency (it is already an indirect
   dependency via Ink) for colorised console output matching `Colors` tokens.

### API surface of `print.ts`

```typescript
import { print } from '../utils/print.js';

print.step('Installing Grafana...');         // ◆  Installing Grafana...
print.pipe('✔ Credentials loaded');          // │  ✔ Credentials loaded
print.success('Done');                       // │  ✔ Done   (green)
print.error('Something failed');             // │  ✗ Something failed  (red)
print.close();                               // └
print.blank();                               //  (empty line)

print.stepFailure(stepName, retryCommand);   // prints the full failure block
```

Colors applied:
- Step header (`◆`) — cyan (matches `Colors.primary`)
- Success lines (`✔`) — green (`Colors.success`)
- Error/fail lines (`✗`) — red (`Colors.error`)
- Pipe/structural lines (`│`, `└`) — gray (`Colors.muted`)

---

## Why

- **Single source of truth** — symbols and color semantics live in `tokens.ts`,
  not scattered as 287 string literals.
- **Consistency** — all action output uses the same visual language as the
  interactive wizard (same symbols, same color meanings).
- **Maintainability** — changing a symbol or color means updating one place.
- **No architectural change** — action files stay as imperative functions;
  no React context is needed.

---

## Approach / Design

### New file

`cli/src/utils/print.ts` — a plain TypeScript module, no React, no Ink.

```typescript
import chalk from 'chalk';
import { Symbols, Colors } from '../design-system/index.js';

const c = {
  primary: chalk[Colors.primary],
  success: chalk[Colors.success],
  error:   chalk[Colors.error],
  muted:   chalk[Colors.muted],
};

export const print = {
  step:        (msg: string) => console.log(c.primary(`${Symbols.active} ${msg}`)),
  pipe:        (msg: string) => console.log(c.muted(`${Symbols.pipe}${msg}`)),
  success:     (msg: string) => console.log(c.success(`${Symbols.pipe} ✔ ${msg}`)),
  error:       (msg: string) => console.error(c.error(`${Symbols.pipe} ${Symbols.fail.trim()} ${msg}`)),
  close:       ()            => console.log(c.muted(Symbols.corner)),
  blank:       ()            => console.log(''),
  stepFailure: (stepName: string, command: string) => { /* full failure block */ },
};
```

### Dependency

Add `chalk` as a direct runtime dependency:

```bash
pnpm add chalk
```

Chalk v5 is ESM-only, matching the project's `"type": "module"` setting.

---

## Files Affected

| File | Console calls | Action |
|------|--------------|--------|
| `cli/src/utils/print.ts` | — | **New file** |
| `cli/src/utils/applySummary.ts` | 54 | Replace with `print.*` |
| `cli/src/actions/cloudflareInstall.ts` | 46 | Replace with `print.*` |
| `cli/src/actions/prometheusInstall.ts` | 42 | Replace with `print.*` |
| `cli/src/actions/metricsAgentInstall.ts` | 40 | Replace with `print.*` |
| `cli/src/actions/grafanaInstall.ts` | 38 | Replace with `print.*` |
| `cli/src/actions/applyInstall.ts` | 33 | Replace with `print.*` |
| `cli/src/actions/cadvisorInstall.ts` | 26 | Replace with `print.*` |
| `cli/src/cli.tsx` | 3 | Replace with `print.*` |
| `cli/src/utils/standaloneInstall.ts` | 2 | Replace with `print.*` |
| `cli/src/actions/filePathInstall.ts` | 2 | Replace with `print.*` |
| `cli/src/app.tsx` | 1 | Replace with `print.*` |

---

## Open Questions / Tradeoffs

1. **chalk vs no color**: We could skip chalk entirely and just use the symbol
   strings without ANSI color codes. This avoids a new dependency but loses the
   color semantics. Chalk is already present transitively via Ink, so making it
   explicit is low-risk.

2. **`applySummary.ts` complexity**: The two summary functions produce multi-line
   structured output with dynamic URLs. These will become a sequence of `print.*`
   calls — readable but verbose. An alternative is a `print.summaryBlock(lines)`
   helper that takes an array.

3. **Tests**: Existing tests mock `console.log` directly. After this change they
   will need to import `print` and mock it, or spy on `console.log` through the
   print module. Tests will be updated alongside each file.
