# Feature Plan: Adding Custom Application Logs via systemd

## Overview

Automate deployment of systemd services for non-containerized applications using Ansible. This captures application logs and routes them to Loki via journald.

**This is Phase 5:** Add custom application logs after Loki deployment (Phase 4).

**What this implements:**
- Ansible role to create systemd service for any application
- Automatic log capture to journald
- Logs flow to Loki via existing Alloy collection
- Integrated with setup.sh script

## Problem Being Solved

**Current State:**
- Docker container logs collected automatically
- systemd service logs collected automatically
- Custom applications (not Docker, not systemd) have no log collection

**Desired State:**
- Any application can be run as systemd service
- Logs automatically captured and sent to Loki
- Queryable in Grafana via `{job="systemd"}`
- Automated deployment via Ansible

## Design Decisions

### Question 1: Ansible Role vs Manual Setup? ✅ DECIDED
**SELECTED: Ansible role**
- Consistent with existing infrastructure patterns
- Repeatable and version controlled
- Easy to deploy/undeploy
- Configurable via group_vars

### Question 2: Generic Role vs App-Specific? ✅ DECIDED
**SELECTED: App-specific role (example: openclaw)**
- Start with one concrete example
- Easy to template for other apps
- Clear documentation pattern
- Users can copy/modify for their apps

### Question 3: Integration with setup.sh? ✅ DECIDED
**SELECTED: Optional flag --openclaw**
- `./scripts/setup.sh --openclaw` to deploy only OpenClaw
- Integrated into main deployment flow
- Follows existing pattern (like --loki)

---

## Solution: systemd Service via Ansible

### Why systemd?
- ✅ Logs automatically to journald (already collected)
- ✅ Auto-restart on failure
- ✅ Starts on boot
- ✅ Easy management
- ✅ Resource limits built-in

### Example: OpenClaw Game

**Step 1: Create service file**

```bash
sudo tee /etc/systemd/system/openclaw.service << 'EOF'
[Unit]
Description=OpenClaw Game
After=network.target

[Service]
Type=simple
User=vvasylkovskyi
WorkingDirectory=/home/vvasylkovskyi
ExecStart=/usr/bin/openclaw
Restart=on-failure
RestartSec=10s

# Send logs to journald
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

**Step 2: Enable and start**

```bash
sudo systemctl daemon-reload
sudo systemctl enable openclaw
sudo systemctl start openclaw
```

**Step 3: Verify**

```bash
sudo systemctl status openclaw
journalctl -u openclaw -f
```

**Step 4: Query in Grafana**

```
{job="systemd"} |~ "openclaw"
```

or

```
{job="systemd", unit="openclaw.service"}
```

### Service File Options

**Working directory:**
```ini
WorkingDirectory=/home/vvasylkovskyi/games/openclaw
```

**Arguments:**
```ini
ExecStart=/usr/bin/openclaw --fullscreen --config /etc/openclaw.conf
```

**Environment variables:**
```ini
Environment="DISPLAY=:0"
Environment="LOG_LEVEL=debug"
```

**Different user:**
```ini
User=gameuser
Group=games
```

**Resource limits:**
```ini
MemoryLimit=512M
CPUQuota=50%
```

**Restart behavior:**
```ini
Restart=always
RestartSec=5s
StartLimitBurst=3
```

## Implementation Approach

### Ansible Role: `openclaw`

Create `ansible-configurations/playbooks/roles/openclaw/` with structure:

```
roles/openclaw/
├── tasks/
│   └── main.yml           # Deploy systemd service
├── templates/
│   └── openclaw.service.j2  # systemd service file
├── defaults/
│   └── main.yml           # Default variables
└── meta/
    └── main.yml           # Dependencies (none)
```

## Configuration Variables

### Add to `inventory/group_vars/all.yml`:

```yaml
# OpenClaw AI Assistant Service
openclaw:
  enabled: true
```

**That's it!** All other values are hardcoded in the role (user, path, executable, etc.).

## File Templates

### 1. systemd Service (`openclaw.service.j2`)

```ini
[Unit]
Description=OpenClaw AI Assistant
After=network.target

[Service]
Type=simple
User={{ ansible_user }}
WorkingDirectory=/home/{{ ansible_user }}
ExecStart=/usr/bin/openclaw
Restart=on-failure
RestartSec=10s

# Send logs to journald
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

All values are hardcoded - simple and clean!

## Ansible Role Tasks

### `roles/openclaw/tasks/main.yml` sequence:

1. **Check if npm is installed**
   - Verify npm exists on system
   - Install nodejs + npm if missing

2. **Check if openclaw is installed**
   - Check if `openclaw` command exists

3. **Install openclaw via npm**
   - Run: `npm install -g openclaw@latest`
   - Only if not already installed

4. **Verify installation**
   - Get openclaw path (e.g., `/usr/local/bin/openclaw`)
   - Store path for systemd service

5. **Deploy systemd service file**
   - Template: `openclaw.service.j2` → `/etc/systemd/system/openclaw.service`
   - Uses actual openclaw path from verification step

6. **Enable and start service**
   - `systemctl enable openclaw`
   - `systemctl start openclaw`

7. **Wait for service to be active**
   - Check: `systemctl is-active openclaw`
   - Retries: 5, delay: 2s

8. **Display access information**
   - Installation path
   - How to check logs: `journalctl -u openclaw -f`
   - Grafana query: `{job="systemd"} |~ "openclaw"`
   - Update command: `npm update -g openclaw`

## Implementation Steps

### Phase 1: Create Ansible Role
1. Create `roles/openclaw/` directory structure
2. Write `defaults/main.yml` with openclaw configuration
3. Write `meta/main.yml` (no dependencies)
4. Create `openclaw.service.j2` template
5. Write `tasks/main.yml` with deployment logic

### Phase 2: Update Configuration
1. Update `inventory/group_vars/all.yml`:
   - Add openclaw configuration block
2. Update `playbooks/main.yml`:
   - Add openclaw role
   - Add tags: `[openclaw, apps]`
   - Add conditional: `when: openclaw.enabled`

### Phase 3: Update Setup Script
1. Update `scripts/setup.sh`:
   - Add `--openclaw` flag parsing
   - Add Ansible execution for openclaw tag

### Phase 4: Testing
1. Deploy: `./scripts/setup.sh --openclaw`
2. Verify service: `systemctl status openclaw`
3. Check logs: `journalctl -u openclaw`
4. Query in Grafana: `{job="systemd"} |~ "openclaw"`

## Files Created/Modified

### New Files
```
ansible-configurations/playbooks/roles/openclaw/
├── defaults/main.yml
├── meta/main.yml
├── tasks/main.yml
└── templates/
    └── openclaw.service.j2
```

### Modified Files
1. `inventory/group_vars/all.yml` - Add openclaw config
2. `playbooks/main.yml` - Add openclaw role
3. `scripts/setup.sh` - Add --openclaw flag

### Created Scripts
- `scripts/uninstall-openclaw.sh` - Cleanup script

### Files on Raspberry Pi
```
/etc/systemd/system/openclaw.service
```

## Success Criteria

1. ✅ OpenClaw systemd service created
2. ✅ Service enabled (starts on boot)
3. ✅ Service running: `systemctl status openclaw`
4. ✅ Logs in journald: `journalctl -u openclaw`
5. ✅ Logs queryable in Grafana: `{job="systemd"} |~ "openclaw"`
6. ✅ Service restarts on failure
7. ✅ Integrated with `./scripts/setup.sh --openclaw`

## Adapting for Other Applications

To add a different application (e.g., myapp):

1. **Copy the openclaw role:**
   ```bash
   cp -r roles/openclaw roles/myapp
   ```

2. **Update files:**
   - `roles/myapp/defaults/main.yml`: Change `openclaw` → `myapp`
   - `roles/myapp/templates/myapp.service.j2`: Update Description
   - `roles/myapp/tasks/main.yml`: Update service name

3. **Add to group_vars:**
   ```yaml
   myapp:
     enabled: true
     executable: "/usr/local/bin/myapp"
     # ... other config
   ```

4. **Add to playbooks/main.yml:**
   ```yaml
   - role: myapp
     tags: [myapp, apps]
     when: myapp.enabled
   ```

5. **Deploy:**
   ```bash
   ./scripts/setup.sh --myapp
   ```

## Uninstalling

To remove the OpenClaw service:

```bash
./scripts/uninstall-openclaw.sh
```

This will:
- Stop and disable the systemd service
- Remove `/etc/systemd/system/openclaw.service`
- Reload systemd daemon

**Note:** The openclaw binary at `/usr/bin/openclaw` is NOT removed.

---

## Docker Log Filtering & Parsing

### Problem: Infrastructure Logs Leak into Application Logs

When querying Docker logs in Grafana, you might see Loki's own internal logs instead of your application logs:

```
level=info ts=2026-04-08T12:16:50.775398711Z caller=roundtrip.go:412 org_id=fake msg="executing query"
```

This happens because Alloy collects logs from ALL containers including Loki, Grafana, Prometheus, and Alloy itself.

### Solution: Filter Out Infrastructure Containers

The `loki` role automatically filters out infrastructure containers and parses log levels from application logs (e.g., uvicorn, Python apps).

**What's included in `alloy-config.alloy.j2`:**

1. **Drop infrastructure containers** - Filters out `/loki`, `/alloy`, `/grafana`, `/prometheus`
2. **Parse log levels** - Extracts `INFO`, `ERROR`, `WARNING`, `CRITICAL`, `DEBUG` as labels
3. **Add container metadata** - Includes `container_name` and `stream` labels

**Alloy configuration snippet:**

```hcl
// Filter out infrastructure containers
discovery.relabel "containers" {
  targets = discovery.docker.containers.targets

  // Drop infra containers
  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(loki|alloy|grafana|prometheus)$"
    action        = "drop"
  }
  
  // Extract container name
  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container_name"
  }
}

// Parse log levels from application logs
loki.process "uvicorn" {
  forward_to = [loki.write.local.receiver]

  stage.regex {
    expression = "^(?P<level>INFO|WARNING|ERROR|CRITICAL|DEBUG):\\s+.*"
  }

  stage.labels {
    values = {
      level = "level",
    }
  }
}
```

### Querying Application Logs

**View all logs from a specific container:**
```
{job="docker", container_name="my_app"}
```

**Filter by log level (parsed automatically):**
```
{job="docker", container_name="my_app", level="ERROR"}
{job="docker", container_name="my_app", level="INFO"}
```

**Search for errors in any container:**
```
{job="docker"} |= "ERROR"
```

**Example: Uvicorn/FastAPI logs**

Uvicorn logs are parsed automatically. You'll see clean output like:

```
INFO:     172.18.0.1:54321 - "GET /health HTTP/1.1" 200 OK
INFO:     Application startup complete.
WARNING:  WatchFiles detected changes in 'main.py'. Reloading...
ERROR:    Exception in ASGI application
```

Query them:
```
{job="docker", container_name="my_app", level="ERROR"}  # Errors only
{job="docker", container_name="my_app"} |= "200 OK"    # Successful requests
```

### Customizing Container Filters

To exclude additional containers from log collection, edit `roles/loki/templates/alloy-config.alloy.j2`:

```hcl
rule {
  source_labels = ["__meta_docker_container_name"]
  regex         = "/(loki|alloy|grafana|prometheus|your_noisy_container)$"
  action        = "drop"
}
```

Then redeploy:
```bash
./scripts/setup.sh --tags loki
```

Or restart Alloy manually on Pi:
```bash
cd ~/loki
docker compose restart alloy
```

---

## Troubleshooting

**npm installation failed:**
```bash
# Check Node.js version
node --version
npm --version

# Manually install if needed
sudo apt update
sudo apt install nodejs npm
```

**openclaw installation failed:**
```bash
# Check npm global path
npm config get prefix

# Manually install
sudo npm install -g openclaw@latest

# Verify installation
which openclaw
openclaw --version
```

**Service won't start:**
```bash
sudo systemctl status openclaw -l
sudo journalctl -u openclaw -n 50
```

**No logs in Grafana:**
- Check service is running: `systemctl status openclaw`
- Verify journald has logs: `journalctl -u openclaw`
- Check Alloy is collecting: `docker logs alloy | grep systemd`

**Update openclaw:**
```bash
# Update to latest version
sudo npm update -g openclaw

# Restart service to use new version
sudo systemctl restart openclaw
```

## Summary

This plan adds custom application log collection via Ansible:

**Architecture:**
```
Ansible → Creates systemd service for app
          ↓
App runs as service → Logs to journald
                      ↓
Alloy collects journald → Sends to Loki
                           ↓
Queryable in Grafana: {job="systemd"}
```

**What gets automated:**
- ✅ Node.js + npm installation (if missing)
- ✅ OpenClaw installation via npm (`npm install -g openclaw@latest`)
- ✅ systemd service creation
- ✅ Service enable (auto-start on boot)
- ✅ Logs automatically to journald
- ✅ Already collected by Alloy (no changes needed)
- ✅ Queryable in Grafana immediately

**Deployment:**
```bash
./scripts/setup.sh --openclaw    # Deploy OpenClaw service
./scripts/setup.sh                # Full stack (includes OpenClaw if enabled)
```

**Benefits:**
- No Loki/Alloy changes needed
- Logs flow automatically via existing collection
- Service management via systemd (`systemctl start/stop/restart openclaw`)
- Easy to adapt for other applications (copy role, update config)

**Ready for implementation!**
