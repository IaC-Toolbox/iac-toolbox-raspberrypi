---
status: completed
completed_date: 2026-04-23
pr_url: https://github.com/IaC-Toolbox/iac-toolbox-cli/pull/134
---

# Bug: ANSIBLE_BECOME_PASSWORD not used — install.sh always prompts interactively

## Summary

Even though the Ink wizard collects the sudo password and passes it as `ANSIBLE_BECOME_PASSWORD` in the child-process environment, `install.sh` unconditionally appends `--ask-become-pass` to the `ansible-playbook` command in local mode. This forces Ansible to prompt interactively regardless of whether the env var is set, blocking the piped-stdio install flow.

## Repo

iac-toolbox-cli

## Observed behaviour

- User enters sudo password in the new `BecomePasswordDialog` wizard step
- `buildInstallEnv` injects `ANSIBLE_BECOME_PASSWORD` into the env passed to `spawn`
- `install.sh` builds the `ANSIBLE_CMD` array and at line 180 appends `--ask-become-pass` whenever `$RPI_LOCAL = true`
- `--ask-become-pass` tells Ansible to read the password from an interactive TTY prompt, which takes precedence over `ANSIBLE_BECOME_PASSWORD`
- Ansible blocks at `BECOME password:` waiting for TTY input that never comes because stdout/stderr are piped

## Expected behaviour

- When `ANSIBLE_BECOME_PASSWORD` is present and non-empty in the environment, `install.sh` should pass `--become` (or `--become-password-file` / `-e ansible_become_password=...`) instead of `--ask-become-pass`
- Ansible reads `ANSIBLE_BECOME_PASSWORD` automatically when the flag is `--become` without `--ask-become-pass`, so no interactive prompt is needed

## Relevant files

- `infrastructure/scripts/install.sh` — lines 179-181: appends `--ask-become-pass` unconditionally in local mode
- `src/utils/installRunner.ts` — `buildInstallEnv` correctly sets `ANSIBLE_BECOME_PASSWORD`
- `src/components/BecomePasswordDialog.tsx` — collects the password correctly

## Context

`install.sh` sets a local shell variable `RPI_LOCAL_MODE` when `--local` is passed (line 20), but the become-pass check on line 179 tests `$RPI_LOCAL` (the raw environment variable), not `$RPI_LOCAL_MODE`. This means the `--ask-become-pass` branch may not even fire consistently. More critically, when it does fire, it overrides the `ANSIBLE_BECOME_PASSWORD` env var that the Ink UI supplies, because `--ask-become-pass` explicitly requests interactive input.

## Likely cause

The fix is a one-line change in `install.sh`: replace `--ask-become-pass` with `--become` when `ANSIBLE_BECOME_PASSWORD` is set in the environment, and omit the become flag entirely when it is not set (leaving default Ansible behaviour). The condition should also use `$RPI_LOCAL_MODE` consistently with the rest of the script.

## Acceptance criteria

- [ ] `install.sh` no longer appends `--ask-become-pass` when `ANSIBLE_BECOME_PASSWORD` is set and non-empty in the environment
- [ ] When `ANSIBLE_BECOME_PASSWORD` is set, `install.sh` appends `--become` so Ansible uses the env var automatically
- [ ] When `ANSIBLE_BECOME_PASSWORD` is empty or unset, `install.sh` falls back to `--ask-become-pass` (preserving interactive behaviour for manual runs)
- [ ] The local-mode check uses `$RPI_LOCAL_MODE` consistently (not `$RPI_LOCAL`) to match the variable set by the `--local` flag
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, and `pnpm build` all pass (shell script change does not affect these but they must still be clean)

## Validation

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```
