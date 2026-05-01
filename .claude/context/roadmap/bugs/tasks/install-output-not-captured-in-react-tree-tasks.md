# Tasks: Install output not captured in React tree — logs vanish on failure

Source: 001-install-output-not-captured-in-react-tree.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: fix/install-output-not-captured-in-react-tree
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: complete

## Tasks

- [ ] 1. Update `runInstallScript` in `installRunner.ts` — change `stdio` from `['inherit', 'inherit', 'pipe']` to `['inherit', 'pipe', 'pipe']` and add an `onLine` callback parameter so both stdout and stderr lines can be streamed to the caller in real time
- [ ] 2. Update `InstallRunnerDialog.tsx` — replace the static "(Output is written to your terminal)" message with a React state array of output lines; wire up the `onLine` callback from `runInstallScript` to push lines into state; render each line as a `<Text>` component in the Ink tree
- [ ] 3. Hold on failure in `InstallRunnerDialog.tsx` — when the script exits with non-zero, do NOT call `onComplete` immediately; instead render an inline error banner (exit code + last error line) below the captured output and wait for the user to press a key before calling `onComplete`
- [ ] 4. Preserve success path — when the script exits with code 0, call `onComplete` immediately as before so the wizard auto-advances to `InstallCompleteDialog`
- [ ] 5. Update or add tests in `InstallRunnerDialog.test.tsx` — cover the new inline output rendering, the failure hold behaviour, and the key-press dismissal
- [ ] 6. Run full validation — `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, `pnpm build` all pass
