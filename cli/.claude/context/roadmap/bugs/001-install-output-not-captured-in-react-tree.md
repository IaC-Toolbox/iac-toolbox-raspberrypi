---
status: completed
completed_date: 2026-04-22
pr_url: https://github.com/IaC-Toolbox/iac-toolbox-cli/pull/132
---

# Bug: Install output not captured in React tree — logs vanish on failure

## Summary

When `install.sh` fails, `InstallRunnerDialog` calls `onComplete` which causes `app.tsx` to immediately unmount the runner and render `InstallCompleteDialog`. Because stdout/stderr were streamed to the raw terminal via `stdio: 'inherit'` (bypassing React), all terminal output disappears and users cannot see why the install failed. Additionally, stderr lines are only captured for the final error summary, never displayed inline.

## Repo

iac-toolbox-cli

## Observed behaviour

- `InstallRunnerDialog` spawns `install.sh` with `stdio: ['inherit', 'inherit', 'pipe']`
- stdout goes directly to the raw terminal, outside Ink's render tree
- stderr is piped but only stored in a buffer; it is never rendered inside the component
- On failure, `onComplete(result)` is called, `installRunning` flips to `false`, and `app.tsx` transitions immediately to `InstallCompleteDialog`
- The Ink UI re-renders, which clears the terminal region previously occupied by raw terminal output
- The user sees a "Install failed" screen with only the last captured stderr line — all prior stdout/stderr output is gone
- The `InstallRunnerDialog` renders only a static message: `(Output is written to your terminal)` with no live lines at all

## Expected behaviour

- All stdout and stderr lines produced by `install.sh` should be captured into a React state array inside `InstallRunnerDialog` and rendered as `<Text>` children in the Ink tree
- On failure, the component should **not** be immediately unmounted; instead it should continue displaying all captured output lines, then show an inline error banner (exit code + last error message) below the output
- The `onComplete` callback should only be called after the user acknowledges the result (e.g. presses a key), or should be deferred such that the output stays visible

## Relevant files

- `src/components/InstallRunnerDialog.tsx` — the component that renders the running state and calls `onComplete`
- `src/utils/installRunner.ts` — spawns the child process with `stdio: ['inherit', 'inherit', 'pipe']`; captures stderr but never emits stdout lines
- `src/app.tsx` — mounts `InstallRunnerDialog` at step 10; transitions to `InstallCompleteDialog` at step 11 as soon as `installResult` is set

## Context

`runInstallScript` (in `installRunner.ts`) spawns bash with stdout set to `'inherit'` so all Ansible progress goes to the raw terminal, bypassing Ink entirely. Stderr is piped and buffered, but the buffer is only surfaced via `InstallResult.errorLines` after the process closes. `InstallRunnerDialog` calls `onComplete` inside a `.then()` on `runInstallScript`, which immediately sets `installRunning = false` and `installResult = <result>` in `app.tsx`. Once `installRunning` is false, React renders `InstallCompleteDialog` instead, and the `InstallRunnerDialog` node is unmounted — clearing anything the raw terminal had painted in that region.

## Likely cause

The root cause is that stdout is passed directly to the process's inherited stdio handle (`'inherit'`) rather than piped through a data listener. Because Ink controls the terminal via its own render loop, raw writes from the child process race with Ink's redraws and are lost when the component unmounts. The fix requires switching `stdio` to `['inherit', 'pipe', 'pipe']` and forwarding both streams into a React state array so all lines are owned by Ink's render tree and persist across re-renders.

## Acceptance criteria

- [ ] All stdout lines from `install.sh` are captured and rendered as `<Text>` lines inside `InstallRunnerDialog` during the run
- [ ] All stderr lines are captured and rendered inline (not only buffered for the post-run summary)
- [ ] When `install.sh` exits with a non-zero code, `InstallRunnerDialog` does **not** call `onComplete` immediately; instead it renders an inline error banner (exit code and last error line) below the captured output
- [ ] The captured output and error banner remain visible until the user presses a key (or some other explicit dismissal), at which point `onComplete` is called and the wizard advances
- [ ] When `install.sh` exits successfully, behaviour is unchanged: the wizard advances automatically to `InstallCompleteDialog`
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, and `pnpm build` all pass after the change

## Validation

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```
