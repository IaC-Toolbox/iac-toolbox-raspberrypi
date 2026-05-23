# State Management for iac-toolbox

## What will be implemented

A lightweight, file-based state layer that tracks which components have been
installed, what configuration they were installed with, and whether they are
currently healthy. This enables idempotent installs, clean uninstalls, and a
`status` command that shows the current state of the observability stack without
requiring the user to SSH in manually.

---

## Why (the problem being solved)

The current CLI has no memory between runs. Every `apply` re-executes the full
Ansible playbook regardless of whether components are already installed and
healthy. This causes several problems:

- **Re-installation churn** — Ansible is idempotent at the task level but still
  makes SSH connections and runs all tasks, which is slow and noisy.
- **No clean removal** — There is no `remove` command. Users must SSH in and
  manually stop containers / delete files.
- **No visibility** — There is no way to ask "what is installed right now?" from
  the CLI.
- **Configuration drift is silent** — If a user changes their `iac-toolbox.yml`
  (e.g. changes a port or credentials) there is no indication that a component
  was deployed with different settings.

---

## How (the approach / design)

### State file location

The state file lives **locally**, adjacent to `iac-toolbox.yml`, at
`<destination>/.iac-toolbox-state.json`. This mirrors how Terraform stores
`terraform.tfstate` next to the config.

Rationale for local (not on-Pi) storage: the CLI already holds the source of
truth for configuration. Storing state locally keeps reads fast (no SSH needed
for plan/status display), avoids requiring write access to the Pi for state
updates, and fits the existing pattern of `target-config.ts` which also reads
and writes local YAML. The tradeoff is that if the local state file is deleted,
the CLI loses its record — but a `refresh` command (see below) can rebuild it
from live health checks.

### State schema

```typescript
// cli/src/state/state-schema.ts

export type ComponentStatus =
  | 'not_installed'
  | 'installing'      // in-flight; treat as failed on next startup
  | 'installed'
  | 'failed'
  | 'degraded'        // installed but health check failing
  | 'removing'        // in-flight removal; treat as unknown on next startup
  | 'removed';

export interface ComponentState {
  status: ComponentStatus;
  installedAt?: string;        // ISO 8601
  lastCheckedAt?: string;      // ISO 8601
  configHash?: string;         // SHA-256 of the component's config section
  version?: string;            // Docker image tag or Ansible role version
  failureReason?: string;      // Last error message if status === 'failed'
}

export type KnownComponent =
  | 'grafana'
  | 'prometheus'
  | 'cadvisor'
  | 'loki'
  | 'metrics-agent'
  | 'cloudflare-tunnel'
  | 'grafana-pagerduty'
  | 'node-metrics-alerts'
  | 'container-metrics-alerts';

export interface IacToolboxState {
  version: 1;
  updatedAt: string;            // ISO 8601
  target: {
    mode: 'local' | 'remote';
    host?: string;
  };
  components: Partial<Record<KnownComponent, ComponentState>>;
}
```

### Config hashing

Before each install, the CLI serialises the component's section from the
resolved YAML config and hashes it with SHA-256. This hash is stored in state.
On subsequent runs, the hash is recomputed and compared:

- **Same hash + `installed`** → skip (no-op, print "already installed").
- **Different hash + `installed`** → print warning "configuration changed since
  last install" and re-apply after user confirmation (or `--force`).
- **`failed` or `degraded`** → always re-apply, regardless of hash.

### Two-phase write (partial failure protection)

The state is written in two phases to prevent silent stuck states:

1. **Before running Ansible**: set `status: 'installing'` and write state.
2. **After Ansible exits**: set `status: 'installed'` (success) or
   `status: 'failed'` with `failureReason` (non-zero exit).

On CLI startup, any component found in `installing` or `removing` status is
treated as `failed` / `unknown` respectively, and the user is warned. This
handles the case where a run was killed mid-flight.

### New CLI commands

#### `iac-toolbox status`

Reads the local state file and optionally performs live health checks.

```
iac-toolbox status [--check] [--component <name>]
```

Without `--check`: prints recorded state from the state file only (fast).

With `--check`: runs the existing health-check validators against each installed
component (SSH + HTTP probes) and updates `lastCheckedAt` + status
(`installed` → `degraded` if health fails). This is the "refresh" path.

Output example (using existing design-system print utilities):

```
◆  Observability Stack — target: pi@192.168.1.10

│  ✔ grafana             installed    2025-11-01  v10.2.0
│  ✔ prometheus          installed    2025-11-01
│  ✔ cadvisor            installed    2025-11-01
│  ⚠ loki                degraded     2025-10-28  health check failing
│  ✗ cloudflare-tunnel   failed       2025-11-02  Ansible exit 1
│  —  node-metrics-alerts not installed
└
```

#### `iac-toolbox remove <component>`

Removes a single installed component by running its corresponding Ansible role
with a `state: absent` variable, then updates state to `removed`.

```
iac-toolbox remove grafana
iac-toolbox remove --all
```

Uses the same two-phase write (`removing` → `removed` / `failed`).

Asks for confirmation before proceeding unless `--yes` is passed.

#### Modified: existing install commands

All existing per-component install commands (`grafana`, `prometheus`, etc.) and
`platform apply` gain state awareness:

- Read state before running.
- Skip components whose hash is unchanged and status is `installed` (unless
  `--force`).
- Write state (two-phase) around the Ansible run.
- Print a clear skip/re-apply reason to the terminal.

New flag: `--force` — ignores state and re-runs unconditionally.

### New files

```
cli/src/state/
├── state-schema.ts        # Types (ComponentStatus, IacToolboxState, etc.)
├── state-store.ts         # Read / write / migrate state file
├── state-hash.ts          # Config section → SHA-256 hash
└── state-check.ts         # Live health reconciliation (used by status --check)
```

`state-store.ts` follows the same pattern as `target-config.ts`: pure functions
(`loadState`, `saveState`, `patchComponentState`) that take a `destination`
path and return typed objects. No global singletons.

### Files affected

| File | Change |
|---|---|
| `cli/src/state/state-schema.ts` | New — types |
| `cli/src/state/state-store.ts` | New — read/write logic |
| `cli/src/state/state-hash.ts` | New — SHA-256 hashing |
| `cli/src/state/state-check.ts` | New — live health reconciliation |
| `cli/src/clis/platform/platform-apply-install.ts` | Add state read/write around install |
| `cli/src/clis/grafana/grafana-install.ts` | Add state read/write |
| `cli/src/clis/prometheus/prometheus-install.ts` | Add state read/write |
| `cli/src/clis/cadvisor/cadvisor-install.ts` | Add state read/write |
| `cli/src/clis/loki/loki-install.ts` | Add state read/write |
| `cli/src/clis/metrics-agent/metrics-agent-install.ts` | Add state read/write |
| `cli/src/clis/cloudflare/cloudflare-install.ts` | Add state read/write |
| `cli/src/cli.tsx` | Register `status` and `remove` commands |
| `cli/src/clis/` | New `status/` and `remove/` feature folders |

---

## Edge cases and how they are handled

### 1. State file missing or corrupt

If `state-store.ts` cannot parse the state file (missing, empty, invalid JSON,
wrong schema version), it returns a blank state (all components
`not_installed`). A warning is printed. The CLI continues normally — it behaves
as if nothing was ever installed, which is safe: Ansible will just re-apply.

A `--reset-state` flag on `status` allows explicitly wiping the file.

### 2. Mid-flight kill (`installing` / `removing` stuck states)

On every CLI startup, `state-store.ts` scans for components in `installing` or
`removing`. Any found are transitioned to `failed` with reason
`"Interrupted — previous run did not complete"` before the command runs. The
user sees a warning and can re-run or investigate.

### 3. Configuration changed after install (hash drift)

If the user edits `iac-toolbox.yml` and re-runs `apply`, the hash comparison
detects the change. The CLI prints:

```
⚠  grafana — configuration changed since last install
   Re-apply will update the running instance. Proceed? [y/N]
```

Passing `--force` skips the prompt and always re-applies.

### 4. Reality diverged from state (manual changes on Pi)

If a user manually stopped a container outside the CLI, state still shows
`installed`. Running `status --check` detects this via health checks and
transitions the component to `degraded`. The user can then re-run the install
command to restore it.

The CLI does **not** auto-reconcile silently. Drift is surfaced as `degraded`
and the user decides whether to re-apply.

### 5. Partial platform apply (some components succeed, one fails)

`platform apply` installs all components in a single Ansible run today. With
state, it will need to track per-component status. The approach: after the
Ansible playbook finishes, `status --check` is run automatically. Components
whose health checks pass are marked `installed`; those failing are marked
`degraded` or `failed`. This gives accurate per-component state even when the
overall playbook exits 0 but a service didn't start.

Future improvement (out of scope for v1): split the platform playbook into
per-component tags so the CLI can run them individually and track state more
granularly during the run.

### 6. State file committed to git accidentally

The state file is named `.iac-toolbox-state.json`. It contains no secrets
(hashes and timestamps only). However, it should be gitignored to avoid
confusion across users sharing the same repo. Implementation will add it to
`.gitignore` automatically the first time it is written, if not already present.

### 7. First-run migration (no existing state)

Users who have already installed the stack before state management existed will
have no state file. The safest path: on first `status --check`, the CLI probes
all known components via health checks and **imports** what it finds into state
as `installed` or `degraded`. This avoids forcing a full re-install for existing
users.

---

## Open questions / tradeoffs

1. **Single-file platform apply vs. per-component tags**: Today, `platform apply`
   runs one monolithic playbook. Tracking per-component state during the run
   requires either splitting into tagged plays or running health checks
   post-apply. v1 will use post-apply health checks. Per-component tags is a
   follow-up.

2. **State file in source control**: Should `.iac-toolbox-state.json` be
   committed? Recommendation: no — gitignore it. It is machine-local metadata,
   not config. If teams want shared state they can use a shared filesystem path.

3. **Remove via Ansible `state: absent`**: Most roles don't have a removal path
   today. Implementing `remove` requires adding `state: absent` tasks to each
   role. This is significant Ansible work. v1 of `remove` can be a
   Docker-level fallback (`docker stop && docker rm`) driven from the CLI
   directly, with full Ansible-based removal as a follow-up.

---

## Implementation order

1. `state-schema.ts` + `state-store.ts` + `state-hash.ts` (no side effects, fully testable)
2. Unit tests for store (read/write/migrate/corrupt-file handling)
3. Add state read/write to `platform-apply-install.ts`
4. Add `status` command (read-only first, no `--check`)
5. Add `--check` health reconciliation to `status`
6. Propagate state to individual component install commands
7. Add `remove` command (Docker fallback for v1)
8. Auto-gitignore on first write
9. First-run migration (import existing installs into state)
