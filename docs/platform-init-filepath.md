# Platform Init — `--filePath` Argument

## What

Add a `--filePath <path>` option to the `platform init` subcommand, matching the pattern already used by `metrics-agent init`.

## Why

`platform apply` already accepts `--filePath`, and `metrics-agent init` uses `--filePath` as its config-path argument. The `platform init` command currently uses `--output` instead, making it inconsistent with the rest of the CLI surface.

## How

In [cli/src/clis/platform/platform.tsx](../cli/src/clis/platform/platform.tsx):

1. Add `.option('--filePath <path>', 'Path to iac-toolbox.yml')` to the `init` subcommand (optional, no default — matches metrics-agent pattern).
2. Keep `--output` for backward compatibility with a default of `./iac-toolbox.yml`.
3. Resolve the effective path as `options.filePath ?? options.output` and pass it to `<InitWizard ... output={filePath} />`.

This is a purely additive change — existing `--output` users are unaffected.

## Files Affected

- `cli/src/clis/platform/platform.tsx` — add option + resolve logic (init command only)

## Open Questions / Tradeoffs

- Should `--output` be deprecated in favour of `--filePath` long-term? Not in scope here — this change only adds `--filePath` without removing anything.
