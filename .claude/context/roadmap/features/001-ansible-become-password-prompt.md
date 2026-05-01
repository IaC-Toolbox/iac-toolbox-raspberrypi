---
status: completed
completed_date: 2026-04-22
pr_url: https://github.com/IaC-Toolbox/iac-toolbox-cli/pull/133
---

# Ansible Become Password — Pre-install sudo prompt

## Overview

When `install.sh` runs Ansible with piped stdio (required for live output capture in the Ink UI), Ansible cannot interactively prompt for the sudo (`become`) password because it detects it is not in a real TTY. This feature adds a masked password prompt step in the Ink wizard immediately before the install dialog, collects the `ANSIBLE_BECOME_PASSWORD` environment variable upfront, and passes it to `buildInstallEnv` so Ansible never needs to prompt interactively.

---

## What Changes

| Area                                      | Change                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/components/BecomePasswordDialog.tsx` | New component — masked password input step shown before install                                             |
| `src/utils/installRunner.ts`              | `buildInstallEnv` gains an optional `becomePassword` parameter; injects `ANSIBLE_BECOME_PASSWORD`           |
| `src/app.tsx`                             | New wizard step 9a between `InstallPromptDialog` and `InstallRunnerDialog`; passes `becomePassword` through |
| `src/components/InstallRunnerDialog.tsx`  | Gains a `becomePassword` prop; forwards to `buildInstallEnv`                                                |

---

## CLI Wizard Changes

### BecomePasswordDialog (new step 9a)

Shown after the user selects "Yes — run install script" in `InstallPromptDialog` and before `InstallRunnerDialog` starts.

```sh
◇ Configuration saved
│
◆ Sudo password required
│ Ansible needs your sudo password to install packages.
│ It will not be stored anywhere.
│
│ Password: ████████
│
└
```

- Uses `ink-text-input` with `mask="*"` (same pattern as `CredentialPrompt` for `docker_hub_token` etc.)
- Password is held only in React state for the lifetime of the wizard session; never written to disk or credentials file
- Empty submit is not allowed — the field must be non-empty before advancing (show inline error: `│ ✗ Password cannot be empty`)
- On submit, advances to `InstallRunnerDialog` and passes the value as `becomePassword` prop

---

## Out of Scope

- Persisting the become password to `~/.iac-toolbox/credentials` — it is intentionally ephemeral
- Supporting `ANSIBLE_BECOME_METHOD` other than the default (`sudo`) — out of scope for this milestone
- `node-pty` pseudo-terminal approach — the env variable approach is simpler and idiomatic for scripted Ansible runs; `node-pty` adds a native dependency and is deferred
- Remote (SSH) install mode — this feature targets local mode (`--local`) only; remote become handling is a separate concern
