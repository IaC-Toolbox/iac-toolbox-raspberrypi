# Tasks: ANSIBLE_BECOME_PASSWORD not used — install.sh always prompts interactively

Source: 003-become-password-not-propagated-to-ansible.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: fix/become-password-not-propagated-to-ansible
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: complete

## Tasks

- [ ] 1. Fix `install.sh` become-pass logic — replace the unconditional `--ask-become-pass` with a conditional: if `ANSIBLE_BECOME_PASSWORD` is set and non-empty, append `--become`; otherwise append `--ask-become-pass` for interactive fallback
- [ ] 2. Fix the local-mode variable inconsistency — the become-pass check uses `$RPI_LOCAL` but should use `$RPI_LOCAL_MODE` to match the variable set by the `--local` flag earlier in the script
- [ ] 3. Run full validation — `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, `pnpm build` all pass
