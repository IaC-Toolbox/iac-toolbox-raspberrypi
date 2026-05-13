# Feature: `iac-toolbox init` + `iac-toolbox apply` — Observability MVP in Two Commands

**Status:** Proposed  
**Date:** 2026-05-11  
**Author:** Viktor Vasylkovskyi

---

## Problem

Setting up the full observability vertical today requires running five separate install commands, answering per-service wizards in the right order, and mentally mapping which services depend on which. First-time users have no way to arrive at a working stack without reading the full docs.

The current flow:

```bash
iac-toolbox install metrics-agent
iac-toolbox install cadvisor
iac-toolbox install grafana
iac-toolbox install prometheus
iac-toolbox install cloudflared
```

The target flow:

```bash
iac-toolbox init
iac-toolbox apply
```

---

## Goal

Deliver a working observability vertical — Grafana + Prometheus + Node Exporter + cAdvisor + Grafana Alloy — on any Linux machine from a single config file, driven by two commands. Cloudflare Tunnel is optional and asked about upfront.

The core stack gives you:

- Host and container metrics (CPU, memory, disk, network, restarts)
- Grafana dashboards accessible on the device's local ports
- Prometheus remote-write pipeline managed by Alloy

If the user opts in to Cloudflare, services are additionally published at public domains with HTTPS. If they skip it, everything is reachable over LAN or SSH port-forward.

---

## Wizard Flow: `iac-toolbox init`

The wizard uses `ink-select-input` for choice steps and `ink-text-input` for text steps, following the same patterns as `TargetInitWizard` and `CloudflareInitWizard`. Steps are shown as a growing breadcrumb trail (completed steps stay visible as `◇`, active step is `◆`).

### Step 1 — Target mode (SelectInput)

```
┌  IaC-Toolbox — Observability Setup
│
◆  Where do you want to install?
   ❯ localhost  (this machine)
     remote     (SSH to another device)
```

Selecting **localhost** skips Steps 2 and 3. Selecting **remote** continues to Step 2.

### Step 2 — SSH connection string (TextInput, remote only)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote
│
◆  SSH connection string
│  › user@remote_ip
```

Validation: must contain `@`, neither part empty. On error, stays on this step with inline message.

### Step 3 — SSH key path (TextInput, remote only)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote
◇  Connection: pi@raspberry-4b.local
│
◆  SSH private key path
│  › ~/.ssh/id_ed25519
```

Pre-filled with `~/.ssh/id_ed25519`. Validates non-empty. After submit, runs an SSH ping check before proceeding:

```
◜  Pinging pi@raspberry-4b.local...
```

The check runs `ssh -i <key> -o BatchMode=yes -o ConnectTimeout=10 <user>@<host> 'echo ok'`. On success:

```
✔  SSH connection successful
```

On failure:

```
│  ✗ SSH connection failed
│  Could not reach pi@raspberry-4b.local with ~/.ssh/raspberrypi-4b
│  Check that the host is reachable and the key is loaded.
│
◆  Retry? Press Enter to try again, or Ctrl+C to abort.
```

The wizard does not advance until the ping succeeds. This mirrors the `TargetInitWizard` retry loop exactly.

### Step 4 — Cloudflare Tunnel (SelectInput)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
│
◆  Enable Cloudflare Tunnel for public HTTPS access?
   ❯ No   (local ports only — access via LAN or SSH tunnel)
     Yes  (public HTTPS at your domain)
```

Selecting **No** skips Steps 5–7 and proceeds directly to Step 8 (write + summary).  
Selecting **Yes** continues to Step 5.

### Step 5 — Domain (TextInput, Cloudflare only)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
│
◆  Your domain (e.g. example.com)
│  › iac-toolbox.com
```

Used to derive `grafana.<domain>` and `prometheus.<domain>`.

### Step 6 — Cloudflare Account ID (TextInput, Cloudflare only)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
◇  Domain: iac-toolbox.com
│
◆  Cloudflare Account ID
│  › 6010b62692a2aa521314ec448f67fb92
```

Validation: exactly 32 hexadecimal characters (same as `CloudflareInitWizard`).

### Step 7 — Cloudflare Zone ID + API Token (TextInput, Cloudflare only)

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
◇  Domain: iac-toolbox.com
◇  Account ID: 6010b626...
│
◆  Cloudflare Zone ID
│  › f595ac9a556083288bc7fbe8a6dc2598
```

Validation: exactly 32 hexadecimal characters. No API call is made — token policies vary and verification calls are unreliable at this stage.

Then:

```
◆  Cloudflare API Token
│  › ••••••••••••••••••••••
```

Validation: non-empty. **No API verification call is made** — Cloudflare token policies often restrict `/user/tokens/verify` and would produce false failures. The token is stored in `~/.iac-toolbox/credentials` and never written to `iac-toolbox.yml`. Any credential error surfaces at `apply` time when the Ansible role first uses it.

### Step 8 — Write config + summary

Config is written to `./iac-toolbox.yml`. Grafana admin password is generated randomly and stored in `~/.iac-toolbox/credentials`.

---

## Full Interaction Transcripts

### Path A — Remote target, Cloudflare disabled

```
┌  IaC-Toolbox — Observability Setup
│
◆  Where do you want to install?
   ❯ localhost  (this machine)
     remote     (SSH to another device)
```

→ user selects **remote**

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote
│
◆  SSH connection string
│  › pi@raspberry-4b.local
```

→ user types `pi@raspberry-4b.local`, presses Enter

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote
◇  Connection: pi@raspberry-4b.local
│
◆  SSH private key path
│  › ~/.ssh/raspberrypi-4b
```

→ user types `~/.ssh/raspberrypi-4b`, presses Enter

```
◜  Pinging pi@raspberry-4b.local...
✔  SSH connection successful
```

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
│
◆  Enable Cloudflare Tunnel for public HTTPS access?
   ❯ No   (local ports only — access via LAN or SSH tunnel)
     Yes  (public HTTPS at your domain)
```

→ user selects **No**

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: disabled
│
◇  Configuration saved
│
│  Written to ./iac-toolbox.yml
│
│  Grafana admin password: xK9#mPqL2w
│  (also stored in ~/.iac-toolbox/credentials — retrievable any time)
│
│  After apply, your stack will be available at:
│    Node Exporter    http://raspberry-4b.local:9100
│    Grafana Alloy    http://raspberry-4b.local:12345
│    Prometheus       http://raspberry-4b.local:9090
│    cAdvisor         http://raspberry-4b.local:8080
│    Grafana          http://raspberry-4b.local:3000
│
│  SSH tunnel shortcut (access from your laptop):
│    ssh -L 3000:localhost:3000 \
│        -L 9090:localhost:9090 \
│        -L 12345:localhost:12345 \
│        pi@raspberry-4b.local
│
│  ℹ  Run to install:
│     iac-toolbox apply --filePath=./iac-toolbox.yml
└
```

---

### Path A (failure) — SSH ping fails, user retries

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote
│
◆  SSH connection string
│  › pi@raspberry-4b.local
```

→ user types, presses Enter

```
◇  Target: remote
◇  Connection: pi@raspberry-4b.local
│
◆  SSH private key path
│  › ~/.ssh/wrong-key
```

→ user types wrong key, presses Enter

```
◜  Pinging pi@raspberry-4b.local...
│
│  ✗ SSH connection failed
│  Could not reach pi@raspberry-4b.local with ~/.ssh/wrong-key
│  Check that the host is reachable and the key is loaded.
│
◆  SSH private key path
│  › ~/.ssh/wrong-key              ← field re-opens, pre-filled with last attempt
```

Pressing Enter on the retry prompt re-opens the SSH key path input field directly — same Step 3 field, same position in the wizard. The connection string from Step 2 remains locked as a breadcrumb and is not re-asked. The user edits the key path in-place and presses Enter again, which immediately triggers another ping with the new value. There is no separate "Retry?" confirmation; the field itself is the retry mechanism.

→ user clears the field, types `~/.ssh/raspberrypi-4b`, presses Enter

```
◜  Pinging pi@raspberry-4b.local...
✔  SSH connection successful
```

If the ping fails again the same error block and re-opened field appear again — the loop repeats until success or Ctrl+C.

→ wizard continues to the Cloudflare step

---

### Path B — Remote target, Cloudflare enabled

```
┌  IaC-Toolbox — Observability Setup
│
◆  Where do you want to install?
     localhost  (this machine)
   ❯ remote     (SSH to another device)
```

→ user selects **remote**

```
◇  Target: remote
│
◆  SSH connection string
│  › pi@raspberry-4b.local
```

→ user types, presses Enter

```
◇  Target: remote
◇  Connection: pi@raspberry-4b.local
│
◆  SSH private key path
│  › ~/.ssh/raspberrypi-4b
```

→ user types, presses Enter

```
◜  Pinging pi@raspberry-4b.local...
✔  SSH connection successful
```

```
◇  Target: remote  pi@raspberry-4b.local
│
◆  Enable Cloudflare Tunnel for public HTTPS access?
     No   (local ports only — access via LAN or SSH tunnel)
   ❯ Yes  (public HTTPS at your domain)
```

→ user selects **Yes**

```
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
│
◆  Your domain (e.g. example.com)
│  › iac-toolbox.com
```

→ user types, presses Enter

```
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
◇  Domain: iac-toolbox.com
│
◆  Cloudflare Account ID
│  › 6010b62692a2aa521314ec448f67fb92
```

→ user types, presses Enter

```
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
◇  Domain: iac-toolbox.com
◇  Account ID: 6010b626...
│
◆  Cloudflare Zone ID
│  › f595ac9a556083288bc7fbe8a6dc2598
```

→ user types, presses Enter

```
◆  Cloudflare API Token
│  › ••••••••••••••••••••••
```

→ user types, presses Enter

```
┌  IaC-Toolbox — Observability Setup
│
◇  Target: remote  pi@raspberry-4b.local
◇  Cloudflare: enabled
◇  Domain: iac-toolbox.com
◇  Account ID: 6010b626...
◇  Zone ID: f595ac9a...
◇  API Token: ••••••••••  → ~/.iac-toolbox/credentials
│
◇  Configuration saved
│
│  Written to ./iac-toolbox.yml
│
│  Grafana admin password: xK9#mPqL2w
│  (also stored in ~/.iac-toolbox/credentials — retrievable any time)
│
│  After apply, your stack will be available at:
│    Node Exporter    http://raspberry-4b.local:9100     (host service)
│    Grafana Alloy    http://raspberry-4b.local:12345    (pipeline UI)
│    Prometheus       https://prometheus.iac-toolbox.com
│    cAdvisor         http://raspberry-4b.local:8080     (LAN only)
│    Grafana          https://grafana.iac-toolbox.com
│
│  ℹ  Run to install:
│     iac-toolbox apply --filePath=./iac-toolbox.yml
└
```

---

### Path C — Localhost target, Cloudflare disabled

```
┌  IaC-Toolbox — Observability Setup
│
◆  Where do you want to install?
   ❯ localhost  (this machine)
     remote     (SSH to another device)
```

→ user selects **localhost** (Steps 2–3 skipped)

```
◇  Target: localhost
│
◆  Enable Cloudflare Tunnel for public HTTPS access?
   ❯ No   (local ports only — access via LAN or SSH tunnel)
     Yes  (public HTTPS at your domain)
```

→ user selects **No**

```
◇  Target: localhost
◇  Cloudflare: disabled
│
◇  Configuration saved
│
│  Written to ./iac-toolbox.yml
│
│  Grafana admin password: mR7$vNpX3q
│  (also stored in ~/.iac-toolbox/credentials — retrievable any time)
│
│  After apply, your stack will be available at:
│    Node Exporter    http://localhost:9100
│    Grafana Alloy    http://localhost:12345
│    Prometheus       http://localhost:9090
│    cAdvisor         http://localhost:8080
│    Grafana          http://localhost:3000
│
│  ℹ  Run to install:
│     iac-toolbox apply --filePath=./iac-toolbox.yml
└
```

---

## Generated Config File Examples

### With Cloudflare disabled (remote target)

```yaml
# Generated by iac-toolbox init
# Safe to commit — no secrets stored here

device:
  profile: platform

docker:
  enabled: true

cloudflare:
  enabled: false

grafana:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana"
  port: 3000
  domain: ""
  provisioning_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana/provisioning"
  prometheus_port: 9090
  prometheus_domain: ""
  admin_user: admin
  admin_password: "{{ grafana_admin_password }}"

prometheus:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/prometheus"
  domain: ""
  port: 9090
  scrape_interval: 15s
  retention: 15d
  grafana_url: http://localhost:3000

target:
  mode: remote
  host: raspberry-4b.local
  user: pi
  ssh_key: ~/.ssh/raspberrypi-4b

grafana_alloy:
  enabled: true
  alloy_remote_write_url: http://localhost:9090/api/v1/write

node_exporter:
  enabled: true

cadvisor:
  enabled: true
```

### With Cloudflare enabled (remote target)

```yaml
# Generated by iac-toolbox init
# Safe to commit — no secrets stored here

device:
  profile: platform

docker:
  enabled: true

cloudflare:
  enabled: true
  mode: api
  account_id: 6010b62692a2aa521314ec448f67fb92
  zone_id: f595ac9a556083288bc7fbe8a6dc2598
  tunnel_name: iac-toolbox-com-tunnel
  cloudflare_api_token: "{{ cloudflare_api_token }}"
  domains:
    - hostname: grafana.iac-toolbox.com
      service_port: 3000
      service: http://localhost:3000
    - hostname: prometheus.iac-toolbox.com
      service_port: 9090
      service: http://localhost:9090

grafana:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana"
  port: 3000
  domain: grafana.iac-toolbox.com
  provisioning_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana/provisioning"
  prometheus_port: 9090
  prometheus_domain: prometheus.iac-toolbox.com
  admin_user: admin
  admin_password: "{{ grafana_admin_password }}"

prometheus:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/prometheus"
  domain: prometheus.iac-toolbox.com
  port: 9090
  scrape_interval: 15s
  retention: 15d
  grafana_url: https://grafana.iac-toolbox.com

target:
  mode: remote
  host: raspberry-4b.local
  user: pi
  ssh_key: ~/.ssh/raspberrypi-4b

grafana_alloy:
  enabled: true
  alloy_remote_write_url: https://prometheus.iac-toolbox.com/api/v1/write

node_exporter:
  enabled: true

cadvisor:
  enabled: true
```

### With Cloudflare disabled (localhost target)

```yaml
# Generated by iac-toolbox init
# Safe to commit — no secrets stored here

device:
  profile: platform

docker:
  enabled: true

cloudflare:
  enabled: false

grafana:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana"
  port: 3000
  domain: ""
  provisioning_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana/provisioning"
  prometheus_port: 9090
  prometheus_domain: ""
  admin_user: admin
  admin_password: "{{ grafana_admin_password }}"

prometheus:
  enabled: true
  version: latest
  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/prometheus"
  domain: ""
  port: 9090
  scrape_interval: 15s
  retention: 15d
  grafana_url: http://localhost:3000

target:
  mode: local

grafana_alloy:
  enabled: true
  alloy_remote_write_url: http://localhost:9090/api/v1/write

node_exporter:
  enabled: true

cadvisor:
  enabled: true
```

---

## Command Behaviour: `iac-toolbox apply --filePath=./iac-toolbox.yml`

### Reuse guideline

`InitWizard` is a thin orchestrator over existing wizard components — it should not re-implement any logic that already exists. Concretely:

- The **SSH ping check** (Steps 2–3) reuses `_testSshConnection` from `TargetInitWizard`, not a new implementation.
- The **Cloudflare credential steps** (Steps 6–7) reuse the `account_id` / `zone_id` / token input components from `CloudflareInitWizard`.
- The **config write** uses the same `loadIacToolboxYaml` / `updateTargetConfig` utilities already in `cli/src/utils/`.

`apply` likewise delegates entirely to the existing per-service install actions (`runGrafanaInstall`, `runPrometheusInstall`, `runMetricsAgentInstall`, `runCAdvisorInstall`, `runCloudflareInstall`) — it sequences them, it does not replace them.

### Pre-flight checks

- Parse and validate `iac-toolbox.yml`
- Load credentials from `~/.iac-toolbox/credentials`
- If `target.mode: remote` — verify SSH connectivity (same check as wizard Step 3)
- Confirm Docker is available on the target

### Install sequence

Services are installed in dependency order. Cloudflare is skipped if `cloudflare.enabled: false`.

```
iac-toolbox apply
  └── reads iac-toolbox.yml + credentials
        ├── ansible-role: node-exporter          (systemd binary on host)
        ├── ansible-role: grafana-alloy           (creates monitoring Docker network)
        ├── ansible-role: prometheus              (joins network, enables remote-write receiver)
        ├── ansible-role: cadvisor               (joins network)
        ├── ansible-role: grafana                (joins network, provisions datasource)
        └── ansible-role: cloudflare-tunnel-api  (skipped if cloudflare.enabled: false)
```

### Post-install output — Cloudflare disabled

```
✔ Node Exporter  running  (:9100)
✔ Grafana Alloy  running  (:12345)
✔ Prometheus     running  (:9090)
✔ cAdvisor       running  (:8080)
✔ Grafana        running  (:3000)

Services are available at:
  Node Exporter    http://raspberry-4b.local:9100     (host metrics scrape endpoint)
  Grafana Alloy    http://raspberry-4b.local:12345    (pipeline graph UI)
  Prometheus       http://raspberry-4b.local:9090
  cAdvisor         http://raspberry-4b.local:8080
  Grafana          http://raspberry-4b.local:3000

SSH tunnel shortcut (access from your laptop):
  ssh -L 3000:localhost:3000 \
      -L 9090:localhost:9090 \
      -L 12345:localhost:12345 \
      pi@raspberry-4b.local

Login: admin / xK9#mPqL2w
(password also in ~/.iac-toolbox/credentials)

Suggested dashboards to import in Grafana (Dashboards → Import):
  Node Exporter Full        ID 1860
  Docker Container Metrics  ID 193
```

### Post-install output — Cloudflare enabled

```
✔ Node Exporter       running  (:9100)
✔ Grafana Alloy       running  (:12345)
✔ Prometheus          running  (:9090)
✔ cAdvisor            running  (:8080)
✔ Grafana             running  (:3000)
✔ Cloudflare Tunnel   active
     grafana.iac-toolbox.com    → :3000
     prometheus.iac-toolbox.com → :9090

Services are available at:
  Node Exporter    http://raspberry-4b.local:9100     (LAN only — host metrics endpoint)
  Grafana Alloy    http://raspberry-4b.local:12345    (LAN only — pipeline graph UI)
  Prometheus       https://prometheus.iac-toolbox.com
  cAdvisor         http://raspberry-4b.local:8080     (LAN only)
  Grafana          https://grafana.iac-toolbox.com

Login: admin / xK9#mPqL2w
(password also in ~/.iac-toolbox/credentials)

Suggested dashboards to import in Grafana (Dashboards → Import):
  Node Exporter Full        ID 1860
  Docker Container Metrics  ID 193
```

Re-running `apply` on an already-installed stack is a full reinstall. Ansible roles are idempotent — existing containers are updated in-place and data volumes are preserved.

---

## What Is Opinionated and Not Prompted

| Value | Default | Rationale |
|---|---|---|
| Grafana version | `latest` | No regression risk for a fresh install |
| Prometheus retention | `15d` | Safe default for a single VPS |
| Scrape interval | `15s` | Standard Prometheus default |
| Cloudflare tunnel mode | `api` | Automated path only; OAuth flow not in scope |
| Admin username | `admin` | Conventional |
| Tunnel name | derived from domain | `<domain-dashes>-tunnel`, e.g. `iac-toolbox-com-tunnel` |
| Service install order | fixed | Node Exporter → Alloy → Prometheus → cAdvisor → Grafana |
| Grafana admin password | randomly generated | Printed once at end of `init`, stored in credentials |

Users who need different values can edit `iac-toolbox.yml` directly after `init` and before `apply`.

---

## Files Affected

| File | Change |
|---|---|
| `cli/src/cli.tsx` | Add `apply` command wired to `--filePath` |
| `cli/src/actions/applyInstall.ts` | New: orchestrates service install order, skips Cloudflare when disabled |
| `cli/src/components/InitWizard.tsx` | New: target mode → SSH → Cloudflare gate → domain + CF credentials |
| `cli/src/utils/configGenerator.ts` | New: derives full `iac-toolbox.yml` from wizard inputs; two output shapes |
| `cli/src/components/TargetInitWizard.tsx` | Reuse `_testSshConnection` — no changes needed |
| `cli/src/components/CloudflareInitWizard.tsx` | Reuse account/zone/token input steps — no changes needed |
| `ansible-configurations/inventory/all.yml` | Accept remote target derived from config `target` section |
| `docs/10-init-apply-mvp.md` | This document |

No changes to existing Ansible roles. No changes to `scripts/install.sh` interface.

---

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | SSH key path | Asked explicitly in wizard — no silent inference |
| 2 | Grafana admin password | Randomly generated, printed once at end of `init`, stored in credentials |
| 3 | Re-running `apply` | Full reinstall; Ansible idempotency preserves data volumes |
| 4 | Cloudflare tunnel name | Derived from domain: `<domain-dashes>-tunnel` |
| 5 | Cloudflare optional | Yes — SelectInput step after target selection; skips entire CF section if No |

---

## What Remains Out of Scope

- **Multi-device support** — `init` targets one device. Fleet management is a future iteration.
- **Dashboard auto-import** — IDs 1860 and 193 are listed in the post-install summary but not imported automatically.
- **`iac-toolbox update`** — Re-applying only changed config values. `apply` is a full reinstall for now.
- **`iac-toolbox destroy`** — Existing `uninstall` scripts remain the mechanism.
- **Configurations page / TUI** — Post-install editable config UI is planned but not in scope.
- **Loki / Tempo** — Logs and traces (Series Parts 3 and 4). The Alloy config produced by `init` is structured so those blocks can be added without touching existing configuration.

---

## Acceptance Criteria

**Local-only path (Cloudflare disabled)**

- [ ] Wizard shows SelectInput for target mode, SelectInput for Cloudflare (No/Yes)
- [ ] `iac-toolbox init` completes asking only: target mode, [SSH string + key if remote], Cloudflare? (No)
- [ ] `iac-toolbox.yml` has `cloudflare.enabled: false` and empty domain values
- [ ] Grafana admin password printed in plaintext once at end of `init`
- [ ] `iac-toolbox apply` installs all five services on the target in the correct order
- [ ] Post-install summary lists all five services with their ports
- [ ] SSH tunnel shortcut printed when target is remote
- [ ] Grafana reachable at `http://<device>:3000` after apply
- [ ] Prometheus datasource in Grafana shows "Data source is working"
- [ ] `node_cpu_seconds_total` returns data in Prometheus

**Cloudflare path**

- [ ] Wizard adds domain, Account ID, Zone ID, and API token steps after selecting Yes
- [ ] Zone ID is validated against Cloudflare API and zone name is shown on success
- [ ] API token is validated against Cloudflare API before proceeding
- [ ] `iac-toolbox.yml` has no plaintext secrets (token as `{{ cloudflare_api_token }}`)
- [ ] `iac-toolbox apply` installs five services plus Cloudflare Tunnel
- [ ] `https://grafana.<domain>` is publicly accessible after apply
- [ ] `https://prometheus.<domain>` is publicly accessible after apply
- [ ] Post-install summary distinguishes public (HTTPS) from LAN-only ports

**Both paths**

- [ ] Re-running `apply` on an already-installed stack completes without errors
- [ ] No secrets appear in `iac-toolbox.yml` or in any committed file
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, `pnpm build` all pass
