# Feature Plan: Grafana Deployment via Ansible (Phase 1)

## Overview

Add automated Grafana deployment to the Raspberry Pi infrastructure using a new Ansible role. This provides the foundation for observability by deploying Grafana's visualization platform, accessible via Cloudflare tunnel at `grafana.iac-toolbox.com`.

**This is Phase 1:** Deploy Grafana only, test authentication and UI access. Prometheus and Node Exporter will be added in subsequent phases.

## Problem Being Solved

**Current State:**
- No visualization platform for metrics
- Manual deployment of monitoring tools
- No web UI for observability

**Desired State:**
- Grafana web UI accessible at `grafana.iac-toolbox.com`
- Grafana admin password stored securely in Vault
- Fully automated deployment via Ansible
- Integration with existing Vault and Cloudflare infrastructure
- Ready to add data sources in future phases

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Raspberry Pi                              │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Grafana (Port 3000)                            │       │
│  │  • Web UI for visualizations                    │◄──────┼─── Cloudflare Tunnel
│  │  • Admin password from Vault                    │       │     grafana.iac-toolbox.com
│  │  • Ready for data sources (Phase 2)             │       │
│  └────────────────┬────────────────────────────────┘       │
│                   │ Fetch password at startup              │
│  ┌────────────────▼────────────────────────────────┐       │
│  │  Vault (Port 8200)                              │       │
│  │  • Stores Grafana admin password                │       │
│  │  • Path: kv/observability/grafana               │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

Future phases will add:
  - Prometheus (metrics storage)
  - Node Exporter (system metrics)
  - Other data sources as needed
```

## Implementation Approach

### 1. New Ansible Role: `grafana`

Create `ansible-configurations/playbooks/roles/grafana/` with the following structure:

```
roles/grafana/
├── tasks/
│   └── main.yml           # Main deployment tasks
├── templates/
│   ├── docker-compose.yml.j2         # Grafana container
│   ├── grafana.service.j2            # Systemd service
│   └── fetch-grafana-password.sh.j2  # Script to fetch password from Vault
├── defaults/
│   └── main.yml           # Default variables
├── handlers/
│   └── main.yml           # Service restart handlers
└── meta/
    └── main.yml           # Dependencies (docker, vault)
```

## Design Decisions

Based on discussion, we've decided:

1. ✅ **Vault Integration:** Fetch Grafana password from Vault at startup (secure, no disk storage)
2. ✅ **Single Role:** Create `grafana` role (focused, simple)
3. ✅ **Cloudflare Exposure:** Expose Grafana via `grafana.iac-toolbox.com`
4. ✅ **Directory:** Use `/home/pi/grafana/` (matches Vault pattern)
5. ✅ **Vault Path:** Store password at `kv/observability/grafana`
6. ✅ **Phase Approach:** Deploy Grafana first, add data sources later
7. ✅ **Testing:** Verify authentication and UI access only (no dashboards yet)

---

## Configuration Variables

Add to `.env` file:

```bash
GRAFANA_ADMIN_PASSWORD=your-secure-password-here  # Generate with: openssl rand -base64 32
```

Add to `inventory/group_vars/all.yml`:

```yaml
# Grafana Configuration
grafana:
  enabled: true
  version: "latest"
  base_dir: "/home/{{ ansible_user }}/grafana"
  port: 3000
  admin_user: "admin"
  admin_password: "{{ lookup('env', 'GRAFANA_ADMIN_PASSWORD') }}"  # Read from .env
  vault_path: "kv/observability/grafana"  # Backup location in Vault
  domain: "grafana.iac-toolbox.com"
```

Update Cloudflare domains in `inventory/group_vars/all.yml`:

```yaml
cloudflare:
  enabled: true
  tunnel_name: main-backend-tunnel
  domains:
    - hostname: api.iac-toolbox.com
      service_port: 80
    - hostname: vault.iac-toolbox.com
      service_port: 8200
    - hostname: grafana.iac-toolbox.com  # NEW
      service_port: 3000                 # NEW
```

## Docker Compose Configuration

The `docker-compose.yml.j2` template will define a single Grafana service:

```yaml
services:
  grafana:
    image: grafana/grafana:{{ grafana.version }}
    container_name: grafana
    restart: unless-stopped
    ports:
      - "{{ grafana.port }}:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER={{ grafana.admin_user }}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_SERVER_ROOT_URL=https://{{ grafana.domain }}
      - GF_SERVER_DOMAIN={{ grafana.domain }}

volumes:
  grafana_data:
```

**Key Configuration:**
- Port 3000: Web UI access
- Volume: Persistent Grafana data (dashboards, settings)
- Password: Fetched from Vault at startup, passed as environment variable
- Root URL: Configured for Cloudflare tunnel domain

## Password Management Strategy

**Simplified approach:**
1. Password is set in `.env` file as `GRAFANA_ADMIN_PASSWORD`
2. Ansible reads it from environment variable
3. Password is backed up to Vault (if Vault is running)
4. Systemd service passes password directly to docker-compose

## Systemd Service Configuration

The `grafana.service.j2` template:

```ini
[Unit]
Description=Grafana Visualization Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory={{ grafana.base_dir }}
User={{ ansible_user }}
Environment="GRAFANA_ADMIN_PASSWORD={{ grafana.admin_password }}"
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

**Key points:**
- No dependency on Vault (simplified!)
- Password passed as environment variable
- Direct docker compose commands (no wrapper script)

## Ansible Role Tasks Sequence

### roles/grafana/tasks/main.yml

1. **Verify Vault dependency**
   - Check Vault container is running
   - Fail gracefully if Vault not available with clear instructions

2. **Generate Grafana password**
   - Generate secure random password: `openssl rand -base64 32`
   - Register as Ansible fact

3. **Store Grafana password in Vault**
   - Check if secret already exists at `kv/observability/grafana`
   - Store password with key `ADMIN_PASSWORD`
   - Only write if secret doesn't exist (idempotent)

4. **Create directory structure**
   - `{{ grafana.base_dir }}`
   - `{{ grafana.base_dir }}/scripts`
   - `{{ grafana.base_dir }}/data`
   - Owner: `{{ ansible_user }}`, mode: 0755

5. **Deploy configuration files**
   - Template: `docker-compose.yml.j2` → `{{ grafana.base_dir }}/docker-compose.yml`
   - Template: `fetch-grafana-password.sh.j2` → `{{ grafana.base_dir }}/scripts/` (mode: 0755)

6. **Pull Grafana container image**
   - Pre-pull `grafana/grafana:{{ grafana.version }}` to avoid timeout

7. **Deploy systemd service**
   - Template: `grafana.service.j2` → `/etc/systemd/system/grafana.service`
   - Daemon reload
   - Enable service

8. **Start Grafana**
   - Execute fetch-grafana-password.sh script
   - Starts container with password from Vault

9. **Wait for Grafana health**
   - Check: `curl http://localhost:3000/api/health`
   - Retries: 30, delay: 2s
   - Expect: `{"database":"ok"}` response

10. **Display access information**
    - Local URL: http://<raspberry-pi-ip>:3000
    - Remote URL: https://grafana.iac-toolbox.com (after Cloudflare tunnel configured)
    - Username: admin
    - Password location: Vault at `kv/observability/grafana`

## Files Created/Modified

### New Files

```
ansible-configurations/
└── playbooks/
    └── roles/
        └── grafana/                                # NEW ROLE
            ├── defaults/
            │   └── main.yml                        # Default config values
            ├── handlers/
            │   └── main.yml                        # Restart handlers
            ├── meta/
            │   └── main.yml                        # Dependencies: docker, vault
            ├── tasks/
            │   └── main.yml                        # Deployment tasks
            └── templates/
                ├── docker-compose.yml.j2           # Grafana service only
                ├── fetch-grafana-password.sh.j2    # Vault fetch script
                └── grafana.service.j2              # Systemd service
```

### Modified Files

1. **`ansible-configurations/inventory/group_vars/all.yml`**
   - Add grafana configuration block
   - Add `grafana.iac-toolbox.com:3000` to cloudflare.domains

2. **`ansible-configurations/playbooks/main.yml`**
   - Add grafana role with tags: `[grafana, monitoring]`
   - Add conditional: `when: grafana is defined and grafana.enabled`
   - Update post_tasks message with Grafana access info

### Files on Raspberry Pi (created by role)

```
/home/pi/
└── grafana/
    ├── docker-compose.yml
    ├── scripts/
    │   └── fetch-grafana-password.sh
    └── data/
        └── grafana/        # Grafana persistent data

/home/pi/vault/
└── data/
    └── (secrets stored here via KV engine)
    # Contains: kv/observability/grafana -> ADMIN_PASSWORD

/etc/systemd/system/
└── grafana.service
```

## Integration with Existing Setup

### Dependency Chain
```
setup → docker → vault → grafana → cloudflare-tunnel
```

The grafana role:
- **Depends on:** docker (for containers), vault (for password storage)
- **Used by:** cloudflare-tunnel (exposes grafana domain)

### Role Ordering in main.yml
```yaml
roles:
  - role: setup
  - role: docker
  - role: vault
    when: vault.enabled
  - role: grafana              # NEW
    when: grafana.enabled      # NEW
  - role: cloudflare-tunnel
    when: cloudflare.enabled
  - role: promote_to_github_runner
    when: github_runner.enabled
```

### One-Script Setup Flow

When user runs `./scripts/setup.sh`:

1. Install Ansible
2. Load .env variables
3. Generate vault password
4. Create encrypted secrets.yml
5. Run main playbook:
   - Setup base system
   - Install Docker
   - Deploy Vault → Initialize → Store root token
   - Deploy Grafana:
     - Check Vault is running
     - Generate Grafana password
     - Store password in Vault at `kv/observability/grafana`
     - Deploy Grafana container
     - Start service via systemd
   - Update Cloudflare tunnel (add grafana domain)
   - Setup GitHub runner (optional)

User gets fully configured system with one command.

## Testing & Verification

### Pre-deployment Validation
```bash
# Syntax check
ansible-playbook --syntax-check playbooks/main.yml

# Dry run
ansible-playbook -i inventory/all.yml playbooks/main.yml \
  --tags grafana --check
```

### Deploy Grafana Only
```bash
cd ansible-configurations
./run-playbook.sh playbooks/main.yml --tags grafana
```

### Verify Deployment
```bash
# Check container running
ssh pi@raspberrypi 'docker ps | grep grafana'

# Check systemd service
ssh pi@raspberrypi 'sudo systemctl status grafana'

# Check Grafana health
ssh pi@raspberrypi 'curl -f http://localhost:3000/api/health'
# Expected: {"database":"ok"}

# Retrieve password from Vault
ssh pi@raspberrypi 'docker exec -e VAULT_TOKEN=$(jq -r .root_token ~/vault/data/vault-init.json) vault vault kv get -field=ADMIN_PASSWORD kv/observability/grafana'
```

### Access Verification (Phase 1 Success Criteria)
1. **Local access:** `http://<pi-ip>:3000`
   - Should show Grafana login page

2. **Remote access:** `https://grafana.iac-toolbox.com` (after Cloudflare tunnel updated)
   - Should show Grafana login page with HTTPS

3. **Login test:**
   - Username: `admin`
   - Password: (from Vault command above)
   - Should successfully log in and see Grafana home page

4. **UI exploration:**
   - Verify no errors on homepage
   - Check "Connections" → "Data sources" → Empty (expected)
   - Check "Dashboards" → Empty (expected)
   - Verify user profile shows "admin" user

### Reboot Test
```bash
ssh pi@raspberrypi 'sudo reboot'
# Wait 2 minutes
ssh pi@raspberrypi 'docker ps | grep grafana'
# Should show grafana container running
ssh pi@raspberrypi 'curl -f http://localhost:3000/api/health'
# Should return healthy status
```
Container should auto-start via systemd.

## Security Considerations

### Grafana Password Management
- Password generated: `openssl rand -base64 32`
- Stored in Vault at `kv/observability/grafana`
- Fetched at runtime, not persisted to disk
- Root token used from vault-init.json (acceptable for homelab)
- Password never appears in docker-compose.yml or environment files

### Network Security
- Grafana: Only exposed via Cloudflare tunnel (TLS encrypted)
- Cloudflare provides DDoS protection and SSL/TLS termination
- Direct port 3000 access only via localhost (not exposed to internet)

### Access Control
- Grafana admin account only (initially)
- Consider creating viewer accounts for read-only access in future
- No data sources configured yet, so no external data access

### Data Persistence
- Grafana: Persistent dashboards and settings in Docker volume
- Volume backup strategy recommended for production use
- Volume location: Docker managed volume `grafana_data`

## Implementation Checklist

### Role Structure
- [ ] Create `roles/grafana/` directory structure
- [ ] Write `defaults/main.yml` with configuration variables
- [ ] Write `meta/main.yml` with dependencies (docker, vault)
- [ ] Write `handlers/main.yml` for service restarts

### Templates
- [ ] Create `docker-compose.yml.j2` (Grafana service only)
- [ ] Create `fetch-grafana-password.sh.j2` (Vault fetch script)
- [ ] Create `grafana.service.j2` (systemd service)

### Tasks
- [ ] Write `tasks/main.yml` with deployment logic:
  - [ ] Verify Vault dependency
  - [ ] Generate Grafana password
  - [ ] Store password in Vault at `kv/observability/grafana`
  - [ ] Create directory structure
  - [ ] Deploy templates
  - [ ] Pull Grafana container image
  - [ ] Deploy systemd service
  - [ ] Start Grafana
  - [ ] Wait for health check
  - [ ] Display access information

### Configuration Updates
- [ ] Update `inventory/group_vars/all.yml`:
  - [ ] Add grafana configuration block
  - [ ] Add grafana domain to cloudflare.domains
- [ ] Update `playbooks/main.yml`:
  - [ ] Add grafana role
  - [ ] Add appropriate tags: `[grafana, monitoring]`
  - [ ] Add conditional: `when: grafana.enabled`
  - [ ] Update post_tasks message

### Testing
- [ ] Test syntax validation
- [ ] Test dry run (--check)
- [ ] Deploy to Raspberry Pi
- [ ] Verify container running
- [ ] Verify systemd service enabled
- [ ] Access Grafana UI locally (http://pi-ip:3000)
- [ ] Test login with password from Vault
- [ ] Verify Grafana home page loads correctly
- [ ] Test reboot persistence
- [ ] Access via Cloudflare tunnel (https://grafana.iac-toolbox.com)

## Success Criteria (Phase 1)

1. ✅ Grafana container running
2. ✅ Grafana accessible at `http://<pi-ip>:3000` (locally)
3. ✅ Grafana accessible at `https://grafana.iac-toolbox.com` (via Cloudflare)
4. ✅ Login works with username `admin` and Vault-stored password
5. ✅ Grafana home page loads without errors
6. ✅ Systemd service enabled and working
7. ✅ Survives Raspberry Pi reboot
8. ✅ No plain-text passwords in files
9. ✅ Password securely stored in Vault at `kv/observability/grafana`
10. ✅ Integrated with one-script setup (`./scripts/setup.sh`)

## Future Enhancements (Phase 2 & 3)

After Grafana is deployed and tested, we'll add:

### Phase 2: Add Prometheus
- Deploy Prometheus container
- Configure Prometheus scrape config
- Auto-configure Prometheus as Grafana data source via API
- Test querying metrics in Grafana

### Phase 3: Add Node Exporter
- Deploy Node Exporter container
- Configure Prometheus to scrape Node Exporter
- Pre-install Node Exporter Full dashboard (ID 1860)
- Verify system metrics visualization

### Phase 4 (Optional): Additional Features
- Prometheus Alertmanager for alerting
- Additional exporters (cAdvisor for container metrics)
- Dashboard backup automation
- Grafana user management (viewers, editors)
- Custom dashboards for specific applications

## Next Steps

With design decisions confirmed, I'm ready to implement:

1. ✅ **Create the grafana role** with all templates and tasks
2. ✅ **Update configuration files** (group_vars, main.yml)
3. ✅ **Test deployment** on Raspberry Pi
4. ✅ **Verify** login and UI access

**Ready to proceed?** I can now generate all the Ansible code for the Grafana role. Should I start with:
- Creating the role structure and all template files?
- Or do you have any other questions about the plan?

## Summary

This plan focuses on **Phase 1: Grafana deployment only**. This simplified approach:

✅ **Reduces complexity** - Deploy one service at a time, test thoroughly
✅ **Matches existing patterns** - Follows same approach as Vault role
✅ **Vault integration** - Securely stores and fetches Grafana password
✅ **Cloudflare ready** - Accessible at grafana.iac-toolbox.com
✅ **One-script compatible** - Integrates with existing `./scripts/setup.sh`
✅ **Testable milestone** - Clear success: login to Grafana UI

**What we're NOT doing yet:**
- Prometheus (Phase 2)
- Node Exporter (Phase 3)
- Dashboards (Phase 3)
- Data sources (Phase 2)

This gives us a working Grafana instance where we can verify:
- Container deployment works
- Vault integration works
- Password fetch mechanism works
- Cloudflare tunnel exposure works
- Systemd auto-start works

Once this is proven, we add Prometheus and Node Exporter in subsequent phases.
