---
status: in-progress
completed_date:
pr_url:
---

# Sync Integration Defaults into iac-toolbox.yml

## Overview

When `iac-toolbox.yml` is loaded via `--extra-vars "@iac-toolbox.yml"`, Ansible's default `hash_behaviour: replace` causes each integration's dict to **completely replace** the corresponding dict in the role's `defaults/main.yml`. Any key present in the role defaults but absent from `iac-toolbox.yml` is silently dropped — leading to runtime failures like `object of type 'dict' has no attribute 'base_dir'`. This was already triggered by enabling `prometheus` (fixed in PR #138). The same class of error will occur the moment grafana, vault, loki, or cloudflare is enabled.

This feature ensures that every integration block emitted by `iacToolboxConfig.ts` contains the full set of keys the Ansible role tasks reference, so that dict-replace behaviour cannot drop required fields. It also fixes three role `defaults/main.yml` files where variable naming is inconsistent with how the tasks actually reference those variables.

## What Changes

| Area | Change |
|------|--------|
| `src/utils/iacToolboxConfig.ts` | Emit full key set for grafana, vault, loki, cloudflare, github_runner when enabled |
| `infrastructure/iac-toolbox.yml` | Template updated to reflect full key sets (manually and via re-running init) |
| `roles/loki/defaults/main.yml` | Rename `loki_defaults` → `loki`, `alloy_defaults` → `alloy` to match task references |
| `roles/cloudflare-tunnel/defaults/main.yml` | Replace flat `cloudflare_enabled: true` with nested `cloudflare:` dict |
| `roles/promote_to_github_runner/defaults/main.yml` | Replace flat `github_runner_enabled: true` with nested `github_runner:` dict |

## Interfaces touched

### `iacToolboxConfig.ts` — generated YAML blocks

**Grafana (before):**
```yaml
grafana:
  enabled: false # coming soon
```

**Grafana (after, when enabled):**
```yaml
grafana:
  enabled: true
  version: "latest"
  base_dir: "~/.iac-toolbox/grafana"
  port: 3000
  admin_user: "admin"
  admin_password: "{{ grafana_admin_password }}" # injected by CLI at deploy time
  domain: "grafana.iac-toolbox.com"
  vault_path: "kv/observability/grafana"
```

> `admin_password` is a secret — the generator emits the Jinja2 placeholder; the CLI injects the real value from `~/.iac-toolbox/credentials` at deploy time, same pattern as `docker_hub_token`.

**Vault (before):**
```yaml
vault:
  enabled: false # coming soon
```

**Vault (after, when enabled):**
```yaml
vault:
  enabled: true
  version: "latest"
  base_dir: "~/.iac-toolbox/vault"
  port: 8200
  enable_kv: true
  enable_audit: true
```

**Loki (before):**
```yaml
loki:
  enabled: true
  version: "latest"
  port: 3100
  retention_hours: 168
```

**Loki (after, adds `base_dir`):**
```yaml
loki:
  enabled: true
  version: "latest"
  base_dir: "~/.iac-toolbox/loki"
  port: 3100
  retention_hours: 168
```

**Cloudflare (before):**
```yaml
cloudflare:
  enabled: false # coming soon
```

**Cloudflare (after, when enabled — `tunnel_name` required by tasks):**
```yaml
cloudflare:
  enabled: true
  tunnel_name: "{{ cloudflare_tunnel_name }}" # set in wizard
```

> The `CloudflareConfigDialog` already collects credentials; ensure `tunnel_name` is also collected and threaded through.

**GitHub Runner (before):**
```yaml
github_runner:
  enabled: false # coming soon
```

**GitHub Runner (after, when enabled):**
```yaml
github_runner:
  enabled: true
  version: "latest"
  work_dir: "~/.iac-toolbox/github-runner"
  labels: "self-hosted,ARM64"
  repo_url: "{{ github_runner_repo_url }}"  # injected at deploy time
  token: "{{ github_runner_token }}"         # injected at deploy time
```

### `roles/loki/defaults/main.yml` — rename to match task references

Tasks reference `loki.xxx` and `alloy.xxx`, but the defaults file defines `loki_defaults` and `alloy_defaults`. The defaults file must be corrected so role-level defaults apply when no override is provided.

**Before:**
```yaml
loki_defaults:
  version: "latest"
  port: 3100
  retention_hours: 168

alloy_defaults:
  version: "latest"
  port: 12345
```

**After:**
```yaml
loki:
  enabled: true
  version: "latest"
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/loki"
  port: 3100
  retention_hours: 168

alloy:
  enabled: true
  version: "latest"
  port: 12345
```

### `roles/cloudflare-tunnel/defaults/main.yml` — replace flat var with dict

Tasks reference `cloudflare.tunnel_name`; defaults currently define a flat `cloudflare_enabled` variable.

**Before:**
```yaml
cloudflare_enabled: true
```

**After:**
```yaml
cloudflare:
  enabled: true
  tunnel_name: ""
```

### `roles/promote_to_github_runner/defaults/main.yml` — replace flat var with dict

Tasks reference `github_runner.repo_url`, `github_runner.work_dir`, etc.; defaults define a flat `github_runner_enabled`.

**Before:**
```yaml
github_runner_enabled: true
```

**After:**
```yaml
github_runner:
  enabled: true
  version: "latest"
  work_dir: "{{ ansible_env.HOME }}/.iac-toolbox/github-runner"
  labels: "self-hosted,ARM64"
  repo_url: ""
  token: ""
```

## Data flow

1. User runs `iac-toolbox init` and selects integrations in the `IntegrationSelectDialog`
2. Per-integration config dialogs collect user-facing settings (admin password, domain, tunnel name, etc.)
3. `generateIacToolboxYaml(config)` in `iacToolboxConfig.ts` maps collected settings into YAML — **after this feature, all keys the Ansible role references are emitted**
4. `iac-toolbox.yml` is written to `<project>/infrastructure/`
5. At deploy time, `install.sh` loads `iac-toolbox.yml` via `--extra-vars "@iac-toolbox.yml"` and injects secrets from `~/.iac-toolbox/credentials`
6. Ansible executes each role; because the dict is now complete, no keys are dropped by hash-replace behaviour

## Configuration

Keys introduced or made explicit per integration when enabled:

| Integration | Key | Default | Set by | Consumed by |
|---|---|---|---|---|
| grafana | `base_dir` | `~/.iac-toolbox/grafana` | generator | role tasks |
| grafana | `version` | `"latest"` | generator | role tasks |
| grafana | `admin_user` | `"admin"` | generator | role tasks |
| grafana | `vault_path` | `"kv/observability/grafana"` | generator | role tasks |
| vault | `base_dir` | `~/.iac-toolbox/vault` | generator | role tasks |
| vault | `enable_kv` | `true` | generator | role tasks |
| vault | `enable_audit` | `true` | generator | role tasks |
| loki | `base_dir` | `~/.iac-toolbox/loki` | generator | role tasks |
| cloudflare | `tunnel_name` | `""` | wizard (CloudflareConfigDialog) | role tasks |
| github_runner | `work_dir` | `~/.iac-toolbox/github-runner` | generator | role tasks |
| github_runner | `labels` | `"self-hosted,ARM64"` | generator | role tasks |

## Security notes

`admin_password` (grafana), `repo_url` and `token` (github_runner) are secrets — never hardcoded in `iac-toolbox.yml`. They follow the existing pattern: the generator emits `"{{ variable_name }}"` Jinja2 placeholders; `install.sh` injects real values from `~/.iac-toolbox/credentials` at deploy time via `--extra-vars`.

## Acceptance criteria

- [ ] Running `iac-toolbox init` and selecting grafana produces a `iac-toolbox.yml` with all of: `enabled`, `version`, `base_dir`, `port`, `admin_user`, `admin_password`, `domain`, `vault_path`
- [ ] Running `iac-toolbox init` and selecting vault produces a `iac-toolbox.yml` with all of: `enabled`, `version`, `base_dir`, `port`, `enable_kv`, `enable_audit`
- [ ] Running `iac-toolbox init` and selecting loki produces a `iac-toolbox.yml` with all of: `enabled`, `version`, `base_dir`, `port`, `retention_hours`
- [ ] Running `iac-toolbox init` and selecting cloudflare produces a `iac-toolbox.yml` with `enabled` and `tunnel_name`
- [ ] Running `iac-toolbox init` and selecting github_runner produces a `iac-toolbox.yml` with all of: `enabled`, `version`, `work_dir`, `labels`, `repo_url`, `token`
- [ ] `ansible-playbook --syntax-check -i inventory/all.yml playbooks/main.yml` exits 0
- [ ] Deploying with any enabled integration no longer fails with `object of type 'dict' has no attribute '<key>'`
- [ ] Integrations left as `enabled: false` still emit only `enabled: false` (no unnecessary keys)
- [ ] `pnpm test:ci` passes

## Validation

```bash
# Unit tests (iacToolboxConfig.ts is covered by tests — add cases for each integration)
pnpm test:ci

# Ansible syntax check
cd infrastructure/ansible-configurations
ansible-playbook --syntax-check -i inventory/all.yml playbooks/main.yml

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Out of Scope

- Adding config dialogs for vault, loki, github_runner, pagerduty beyond `enabled` toggle — those are tracked separately as integration dialogs
- The pagerduty role (does not exist yet — `enabled: false # coming soon` is sufficient)
- Migrating from `hash_behaviour: replace` to `hash_behaviour: merge` — that change is Ansible-global and risky; full-dict emission is the safe fix
- Changing secret storage (`~/.iac-toolbox/credentials`) or injection mechanism — out of scope for this fix
