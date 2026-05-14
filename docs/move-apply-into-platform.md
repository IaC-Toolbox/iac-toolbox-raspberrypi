# Move `apply` Command into `platform`

## What

Move the `apply` command from the top-level CLI (`iac-toolbox apply`) to a
subcommand of `platform` (`iac-toolbox platform apply`).

## Why

`apply` installs the full observability stack — the same concern as `platform`.
Grouping it under `platform` keeps all platform-lifecycle actions in one place
and reduces top-level command clutter.

## How

1. In `cli/src/clis/platform/platform.tsx`, import `buildApplyCommand` and
   register it as a subcommand via `platform.addCommand(buildApplyCommand())`.
2. In `cli/src/cli.tsx`, remove the `buildApplyCommand` import and the
   `program.addCommand(buildApplyCommand())` call.

The `clis/apply/` folder and its files (`apply-command.ts`, `apply-install.ts`,
`apply-summary.ts`) are unchanged — only the wiring moves.

## Files Affected

| File | Change |
|------|--------|
| `cli/src/clis/platform/platform.tsx` | Add `buildApplyCommand` import + `platform.addCommand(buildApplyCommand())` |
| `cli/src/cli.tsx` | Remove `buildApplyCommand` import and `program.addCommand(buildApplyCommand())` |

## Tradeoffs

- **Breaking change**: anyone calling `iac-toolbox apply` directly will need to
  update to `iac-toolbox platform apply`. No backwards-compat shim is added.
- No other files or tests are affected by this wiring change.
