# Tasks: Ansible Become Password — Pre-install sudo prompt

Source: 001-ansible-become-password-prompt.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/ansible-become-password-prompt
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: complete

## Tasks

- [ ] 1. Create `src/components/BecomePasswordDialog.tsx` — new Ink component with a masked `TextInput` (mask="\*") that collects the sudo password; validates non-empty on submit (shows inline error if empty); calls `onComplete(password)` on valid submit
- [ ] 2. Update `buildInstallEnv` in `src/utils/installRunner.ts` — add optional `becomePassword?: string` parameter; inject `ANSIBLE_BECOME_PASSWORD: becomePassword || ''` into the returned env object
- [ ] 3. Update `InstallRunnerDialog.tsx` — add `becomePassword?: string` prop; forward it to `buildInstallEnv`
- [ ] 4. Update `app.tsx` — add `becomePassword` state; insert new wizard step 9a between `InstallPromptDialog` confirmation and `InstallRunnerDialog` mount; pass `becomePassword` to `InstallRunnerDialog`
- [ ] 5. Add tests for `BecomePasswordDialog` — cover: empty submit shows error, valid password calls onComplete, input is masked
- [ ] 6. Update existing `InstallRunnerDialog` tests if needed to account for the new `becomePassword` prop
- [ ] 7. Run full validation — `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, `pnpm build` all pass
