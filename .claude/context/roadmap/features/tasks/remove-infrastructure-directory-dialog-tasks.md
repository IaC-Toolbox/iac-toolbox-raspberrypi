# Tasks: Remove Infrastructure Directory Dialog — Always use `/infrastructure`

Source: 003-remove-infrastructure-directory-dialog.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/remove-infrastructure-directory-dialog
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: pending

## Tasks

- [ ] 1. Refactor `DirectoryDialog.tsx` — Remove the interactive `choose` step and replace with a static notice; call `onSelect(infrastructureDir, false)` via `useEffect` on mount
- [ ] 2. Verify `app.tsx` requires no changes — confirm step 3 call site still works with the updated `DirectoryDialog` API
- [ ] 3. Run full validation suite — `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0
