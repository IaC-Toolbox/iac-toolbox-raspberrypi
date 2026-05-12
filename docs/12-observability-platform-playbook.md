# observability_platform.yml — Unified Observability Ansible Playbook

## Problem

`iac-toolbox apply` currently invokes `install.sh` **five separate times**, once
per service (metrics-agent, prometheus, cadvisor, grafana, cloudflare). Each
invocation runs the full shell script setup — including the `common.yml` import —
so common tasks (Docker check, connection ping, facts gathering) execute
repeatedly. This also means each failure terminates the whole sequence instead of
letting Ansible handle role-level errors naturally.

Additionally, there is a latent bug: `cadvisorInstall.ts` calls
`install.sh --cadvisor` but `install.sh` has no `--cadvisor` case. Any standalone
`iac-toolbox cadvisor install` would fail immediately with "Unknown option".

---

## What Will Be Implemented

### 1. New playbook: `ansible-configurations/playbooks/observability_platform.yml`

A single Ansible playbook that runs the full observability stack in one pass:

```
common (always) →
  node_exporter (when: node_exporter.enabled) →
  grafana-alloy  (when: grafana_alloy.enabled) →
  prometheus     (when: prometheus.enabled) →
  cadvisor       (when: cadvisor.enabled — defaults to true) →
  grafana        (when: grafana.enabled) →
  cloudflare     (when: cloudflare.enabled — optional, defaults to false)
```

`common.yml` is imported once at the top. All other roles use `when` conditions
driven by the `iac-toolbox.yml` variables already passed via `--extra-vars`.

cloudflare is explicitly optional — the role is skipped unless
`cloudflare.enabled: true` is set in the config.

### 2. `scripts/install.sh` — two additions

- Add `--observability-platform` flag → sets `ANSIBLE_PLAYBOOK="observability_platform.yml"`
- Add `--cadvisor` flag → sets `ANSIBLE_PLAYBOOK="cadvisor.yml"` (fixes the latent
  bug)

### 3. New playbook: `ansible-configurations/playbooks/cadvisor.yml`

A minimal per-service playbook (matching the pattern of grafana.yml, prometheus.yml)
for standalone `iac-toolbox cadvisor install` use.

### 4. Simplify `cli/src/actions/applyInstall.ts`

`runInstallSequence` currently calls five separate action functions
(`runMetricsAgentInstall`, `runPrometheusInstall`, etc.), each of which spawns
`install.sh` with a different flag.

Replace this with a single `spawnSync('bash', [scriptPath, '--observability-platform', '--filePath', filePath])` call, passing the config file so Ansible
resolves all `when` conditions from it.

The individual action functions (`runGrafanaInstall`, etc.) are **not removed** —
they remain available for standalone per-service commands.

---

## Why

- **Single Ansible run** — `common.yml` executes once; connection setup,
  facts gathering, and Docker checks happen once.
- **Natural idempotency** — Ansible roles are already idempotent; re-running
  `iac-toolbox apply` after a partial failure is safe without manual retry logic.
- **Simpler CLI code** — `runInstallSequence` shrinks from ~60 lines of
  step-by-step orchestration to a single spawn call.
- **Bug fix** — `--cadvisor` flag added to `install.sh`.
- **Consistent pattern** — `observability_platform.yml` follows the same
  structure as `site.yml` but scoped to the observability vertical.

---

## Files Affected

| File | Change |
|------|--------|
| `ansible-configurations/playbooks/observability_platform.yml` | **New** |
| `ansible-configurations/playbooks/cadvisor.yml` | **New** |
| `scripts/install.sh` | Add `--observability-platform` and `--cadvisor` flags |
| `cli/src/actions/applyInstall.ts` | Replace `runInstallSequence` body with single spawn |

---

## Open Questions / Tradeoffs

1. **Per-step failure messages**: The current approach prints "Install failed at:
   metrics-agent" with a targeted retry command. With a single Ansible run,
   failure output comes from Ansible directly. The `print.stepFailure` block in
   `applyInstall.ts` can be simplified to a generic failure hint pointing to
   `iac-toolbox apply`.

2. **cadvisor `when` default**: In `observability_platform.yml`, cadvisor should
   run by default (matching the current `cadvisor?.enabled !== false` guard in the
   CLI). The Ansible `when` condition will be:
   `when: cadvisor is not defined or cadvisor.enabled | default(true)`.

3. **Progress visibility**: With five separate Ansible runs, each service shows
   its own header in the terminal. With one run, all output flows together. This
   is acceptable — Ansible's task output already shows which role/task is running.
