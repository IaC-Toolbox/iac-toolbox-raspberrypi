---
status: draft
completed_date:
pr_url:
---

# Integration Dialog — Prometheus & Loki as Standalone Integrations

## Overview

The integrations selection dialog currently bundles Prometheus and Loki silently inside the Grafana selection path — selecting Grafana implicitly enables both without user awareness. This feature separates Prometheus and Loki into their own independently selectable entries in the dialog, updates the Grafana label to accurately describe its role (dashboards and logs visualization), and pre-selects all three for the `devops-server` profile. The `iac-toolbox.yml` config gains top-level `prometheus.enabled` and `loki.enabled` keys so the Ansible roles can gate installation without parsing the Grafana block.

## What Changes

| Area | Change |
| --- | --- |
| `src/components/IntegrationSelectDialog.tsx` | Rename Grafana label; add `prometheus` and `loki` as selectable entries |
| `src/components/DeviceProfileDialog.tsx` | Add `prometheus` and `loki` to `PROFILE_DEFAULTS['devops-server']` |
| `src/utils/iacToolboxConfig.ts` | Generate `prometheus` and `loki` top-level blocks based on their own selection flags, independent of the Grafana block |
| `infrastructure/iac-toolbox.yml` | Example config gains `prometheus: enabled: true/false` and `loki: enabled: true/false` at the top level |

## CLI Wizard Changes

### Before (current behaviour)

The integrations list shows Grafana as a single catch-all observability entry. Prometheus and Loki are never mentioned.

```sh
◆ Select integrations to install
│ Use space to select, enter to confirm
│ Learn more: https://docs.iac-toolbox.com/integrations
│
│   ◉ GitHub Build Workflow (docker image push)
│   ○ GitHub Runner (convert current device into runner) — coming soon
│ ❯ ◉ Cloudflare Tunnel (expose services via secure tunnel)
│   ○ HashiCorp Vault (secrets management)
│   ◉ Grafana (metrics, logs and alerts)
│   ○ PagerDuty — coming soon
│
│ [ Confirm: press Enter ]
└
```

### After (new behaviour)

Grafana label is narrowed to its actual role. Prometheus and Loki appear as their own entries. All three are pre-selected for `devops-server`.

```sh
◆ Select integrations to install
│ Use space to select, enter to confirm
│ Learn more: https://docs.iac-toolbox.com/integrations
│
│   ◉ GitHub Build Workflow (docker image push)
│   ○ GitHub Runner (convert current device into runner) — coming soon
│ ❯ ◉ Cloudflare Tunnel (expose services via secure tunnel)
│   ○ HashiCorp Vault (secrets management)
│   ◉ Grafana (dashboards and logs visualization)
│   ◉ Prometheus (metrics collection)
│   ◉ Loki (logs collection)
│   ○ PagerDuty — coming soon
│
│ [ Confirm: press Enter ]
└
```

### Device profile pre-selection

The `devops-server` profile now pre-selects `grafana`, `prometheus`, and `loki`. The `app-server` profile is unchanged.

| Profile | Pre-selected integrations |
| --- | --- |
| `devops-server` | `github_runner` (coming soon), `cloudflare`, `vault`, `grafana`, `prometheus`, `loki` |
| `app-server` | `github_build_workflow`, `cloudflare` |
| `both` | _(none — user selects manually)_ |

## Interfaces touched

### `INTEGRATIONS` constant — `src/components/IntegrationSelectDialog.tsx`

**Before:**
```typescript
{
  id: 'grafana',
  label: 'Grafana (metrics, logs and alerts)',
  selectable: true,
},
```

**After:**
```typescript
{
  id: 'grafana',
  label: 'Grafana (dashboards and logs visualization)',
  selectable: true,
},
{
  id: 'prometheus',
  label: 'Prometheus (metrics collection)',
  selectable: true,
},
{
  id: 'loki',
  label: 'Loki (logs collection)',
  selectable: true,
},
```

The new entries are inserted between `grafana` and `pagerduty`. The `pagerduty` entry remains last and non-selectable.

### `PROFILE_DEFAULTS` — `src/components/DeviceProfileDialog.tsx`

**Before:**
```typescript
export const PROFILE_DEFAULTS: Record<DeviceProfile, string[]> = {
  'devops-server': ['github_runner', 'cloudflare', 'vault', 'grafana'],
  'app-server': ['github_build_workflow', 'cloudflare'],
  both: [],
};
```

**After:**
```typescript
export const PROFILE_DEFAULTS: Record<DeviceProfile, string[]> = {
  'devops-server': ['github_runner', 'cloudflare', 'vault', 'grafana', 'prometheus', 'loki'],
  'app-server': ['github_build_workflow', 'cloudflare'],
  both: [],
};
```

### `generateIacToolboxYaml` — `src/utils/iacToolboxConfig.ts`

Currently, when `grafana` is selected, the function unconditionally emits `prometheus`, `loki`, `node_exporter`, and `alloy` blocks. After this change:

- The `prometheus` block is emitted with `enabled: true` only when `prometheus` is in `selectedIntegrations`; otherwise `enabled: false`.
- The `loki` block is emitted with `enabled: true` only when `loki` is in `selectedIntegrations`; otherwise `enabled: false`.
- `node_exporter` and `alloy` continue to be emitted alongside Grafana when Grafana is selected (they are internal supporting services, not user-facing selections).
- The Grafana block itself is unchanged — it still requires only `grafana` to be selected.

The `IacToolboxYamlConfig` interface does not need new fields — `selectedIntegrations` already carries the `prometheus` and `loki` flags.

## Data flow

```
DeviceProfileDialog
  → sets profile (devops-server / app-server / both)
  → PROFILE_DEFAULTS maps profile to pre-selected integration IDs
        (now includes prometheus, loki for devops-server)

IntegrationSelectDialog
  → receives defaultSelected from PROFILE_DEFAULTS
  → user toggles grafana / prometheus / loki independently
  → onConfirm(selectedIds: string[])   ← now may contain 'prometheus', 'loki'

app.tsx (existing GrafanaConfigDialog path unchanged)
  → passes selectedIntegrations to writeIacToolboxYaml

generateIacToolboxYaml
  → grafana block: gates on selectedIntegrations.includes('grafana')
  → prometheus block: gates on selectedIntegrations.includes('prometheus')   ← new independent gate
  → loki block: gates on selectedIntegrations.includes('loki')               ← new independent gate
  → writes iac-toolbox.yml
```

## Output — iac-toolbox.yml

### DevOps Server profile — all three selected

```yaml
# Generated by iac-toolbox init
# Safe to commit — no secrets stored here

device:
  profile: "devops-server"

docker:
  enabled: true # always installed, not configurable

grafana:
  enabled: true
  version: "latest"
  port: 3000
  admin_user: "admin"
  admin_password: "{{ grafana_admin_password }}" # injected by CLI at deploy time

prometheus:
  enabled: true          # set by user selection
  version: "latest"
  port: 9090
  scrape_interval: "15s"
  retention: "15d"

node_exporter:
  version: "latest"
  port: 9100

loki:
  enabled: true          # set by user selection
  version: "latest"
  port: 3100
  retention_hours: 168

alloy:
  enabled: true
  version: "latest"
  port: 12345
```

### App Server profile — none selected

```yaml
device:
  profile: "app-server"

grafana:
  enabled: false

prometheus:
  enabled: false         # set by user selection

loki:
  enabled: false         # set by user selection
```

### Grafana selected without Prometheus or Loki

```yaml
grafana:
  enabled: true
  ...

prometheus:
  enabled: false         # set by user selection

loki:
  enabled: false         # set by user selection
```

## Configuration

| Key | Default | Set by | Consumed by |
| --- | --- | --- | --- |
| `prometheus.enabled` | `false` | User selection in CLI wizard | Ansible prometheus role — gates installation |
| `loki.enabled` | `false` | User selection in CLI wizard | Ansible loki role — gates installation |

No new environment variables or secrets are introduced. Prometheus and Loki have no credentials stored in `~/.iac-toolbox/credentials`.

## Acceptance criteria

- [ ] The integrations dialog shows "Grafana (dashboards and logs visualization)" — not "metrics, logs and alerts"
- [ ] Prometheus and Loki appear as independently selectable entries between Grafana and PagerDuty
- [ ] Selecting `devops-server` profile pre-selects Grafana, Prometheus, and Loki
- [ ] Selecting `app-server` profile does NOT pre-select Prometheus or Loki
- [ ] Deselecting Prometheus while keeping Grafana selected produces `prometheus: enabled: false` in `iac-toolbox.yml`
- [ ] Deselecting Loki while keeping Grafana selected produces `loki: enabled: false` in `iac-toolbox.yml`
- [ ] Selecting Prometheus without Grafana produces `prometheus: enabled: true` and `grafana: enabled: false`
- [ ] `iac-toolbox.yml` always contains top-level `prometheus` and `loki` keys regardless of selection
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0

## Validation

Run the full validation suite from `CLAUDE.md`:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

Then manually run `iac-toolbox` and verify:

1. Choose `devops-server` — confirm Grafana, Prometheus, and Loki are pre-checked in the integrations list.
2. Deselect Prometheus and confirm — open the generated `infrastructure/iac-toolbox.yml` and verify `prometheus: enabled: false`.
3. Choose `app-server` — confirm neither Prometheus nor Loki is pre-checked.

## Out of Scope

- Dedicated per-integration config dialogs for Prometheus (e.g. scrape interval, retention period) — `PrometheusConfigDialog` exists in the codebase but is not wired in; hooking it up is a separate task
- Dedicated config dialog for Loki (retention hours are hardcoded to 168)
- Changing the Ansible roles themselves — only the CLI config generation and dialog labels are in scope
- Adding Prometheus or Loki to the `ObservabilityRemoteDialog` (app-server remote shipping) — that dialog already references Prometheus/Loki ports and is out of scope here
