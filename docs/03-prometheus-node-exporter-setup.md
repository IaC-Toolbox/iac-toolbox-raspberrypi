# Feature Plan: Prometheus + Node Exporter Deployment via Ansible (Phase 2)

## Overview

Add automated Prometheus and Node Exporter deployment to complement the existing Grafana installation. This provides metrics collection and storage, completing the observability stack.

**This is Phase 2:** Deploy Prometheus (metrics storage) and Node Exporter (system metrics collector), then auto-configure Prometheus as a Grafana data source.

## Problem Being Solved

**Current State:**
- Grafana running but no data sources
- No metrics collection or storage
- No visibility into system performance

**Desired State:**
- Prometheus collecting and storing metrics
- Node Exporter exposing system metrics (CPU, memory, disk, network)
- Prometheus auto-configured as Grafana data source
- Grafana can query and display metrics immediately
- All deployed via single Ansible command

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Raspberry Pi                              │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Grafana (Port 3000)                            │       │
│  │  • Queries Prometheus for metrics               │◄──────┼─── Cloudflare
│  │  • Prometheus pre-configured as data source     │       │
│  └────────────────┬────────────────────────────────┘       │
│                   │ PromQL queries                         │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Prometheus (Port 9090)                         │       │
│  │  • Scrapes metrics every 15s                    │       │
│  │  • Stores time-series data                      │       │
│  │  • Retention: 15 days                           │       │
│  └────────────────┬────────────────────────────────┘       │
│                   │ HTTP GET /metrics every 15s            │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Node Exporter (Port 9100)                      │       │
│  │  • Exposes system metrics                       │       │
│  │  • CPU, memory, disk, network stats             │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Design Questions

### Question 1: Role Organization
**Option A:** Single `prometheus` role containing both Prometheus and Node Exporter
- Simpler, they're deployed together
- Single docker-compose file
- One systemd service

**Option B:** Separate `prometheus` and `node-exporter` roles
- More granular control
- Can deploy independently
- More complex

**Recommendation:** Option A (single role)
**Your preference?**

### Question 2: Grafana Data Source Auto-Configuration
**Option A:** Auto-configure Prometheus data source via Grafana API
- Role makes HTTP call to Grafana after deployment
- Fully automated, zero manual steps
- Requires Grafana admin password

**Option B:** Manual configuration (user adds data source via UI)
- Simpler role, no API calls
- User documented steps

**Recommendation:** Option A (fully automated)
**Your preference?**

### Question 3: Prometheus Configuration
Should Prometheus retention be configurable via .env?

**Option A:** Fixed 15 days (hardcoded)
- Simple, good default for Pi

**Option B:** Configurable via environment variable
- `PROMETHEUS_RETENTION=15d` in .env
- Users can adjust based on disk space

**Recommendation:** Option B (configurable)
**Your preference?**

### Question 4: Should Prometheus UI be exposed via Cloudflare?
**Option A:** Only Grafana exposed
- Prometheus accessible locally only
- More secure

**Option B:** Expose Prometheus UI at prometheus.iac-toolbox.com
- Remote access to Prometheus UI
- Useful for debugging
- Another domain to manage

**Recommendation:** Option A (local only)
**Your preference?**

### Question 5: Directory Structure
Where to deploy on Raspberry Pi?

**Option A:** Single observability directory
- `/home/user/observability/` containing Prometheus + Node Exporter + Grafana
- All metrics services together

**Option B:** Separate prometheus directory
- `/home/user/prometheus/` (matches Grafana pattern)
- Cleaner separation

**Recommendation:** Option B (separate directory)
**Your preference?**

### Question 6: Systemd Service Strategy
**Option A:** Single service managing both containers
- `observability.service` or `prometheus.service`
- Starts/stops both together via docker-compose

**Option B:** Separate services for each
- `prometheus.service` and `node-exporter.service`
- More granular control

**Recommendation:** Option A (single service)
**Your preference?**

---

## Configuration (Assuming answers above)

### Environment Variables (.env)
```bash
# Optional: Configure Prometheus retention
PROMETHEUS_RETENTION=15d
```

### Ansible Variables (group_vars/all.yml)
```yaml
prometheus:
  enabled: true
  version: "latest"
  base_dir: "/home/{{ ansible_user }}/prometheus"
  port: 9090
  scrape_interval: "15s"
  retention: "{{ lookup('env', 'PROMETHEUS_RETENTION') | default('15d', true) }}"

node_exporter:
  version: "latest"
  port: 9100
```

## Implementation Approach

### New Ansible Role: `prometheus`

```
roles/prometheus/
├── tasks/
│   └── main.yml
├── templates/
│   ├── docker-compose.yml.j2
│   ├── prometheus.yml.j2
│   └── prometheus.service.j2
├── defaults/
│   └── main.yml
├── handlers/
│   └── main.yml
└── meta/
    └── main.yml
```

### Docker Compose Template

```yaml
services:
  prometheus:
    image: prom/prometheus:{{ prometheus.version }}
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "{{ prometheus.port }}:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time={{ prometheus.retention }}'

  node-exporter:
    image: prom/node-exporter:{{ node_exporter.version }}
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    ports:
      - "{{ node_exporter.port }}:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

volumes:
  prometheus_data:
```

### Prometheus Config Template

```yaml
global:
  scrape_interval: {{ prometheus.scrape_interval }}
  evaluation_interval: {{ prometheus.scrape_interval }}

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:{{ prometheus.port }}']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:{{ node_exporter.port }}']
```

## Ansible Tasks Sequence

### roles/prometheus/tasks/main.yml

1. **Create directory structure**
   - `{{ prometheus.base_dir }}`
   - Owner: `{{ ansible_user }}`

2. **Deploy configuration files**
   - Template: `docker-compose.yml.j2`
   - Template: `prometheus.yml.j2`

3. **Pull container images**
   - `prom/prometheus:{{ prometheus.version }}`
   - `prom/node-exporter:{{ node_exporter.version }}`

4. **Deploy systemd service**
   - Template: `prometheus.service.j2`
   - Enable service

5. **Start Prometheus stack**
   - `docker compose up -d`

6. **Wait for Prometheus health**
   - Check: `http://localhost:9090/-/healthy`
   - Retries: 30, delay: 2s

7. **Verify Node Exporter target**
   - Query Prometheus API for targets
   - Ensure node-exporter shows "up"

8. **Auto-configure Grafana data source**
   - Check if Prometheus data source exists
   - Create via Grafana API if not exists
   - Use Grafana admin password from variables

9. **Display access information**

## Grafana Data Source Auto-Configuration

**If auto-configuration is enabled:**

```yaml
- name: Check if Prometheus datasource exists in Grafana
  uri:
    url: "http://localhost:3000/api/datasources/name/Prometheus"
    user: "{{ grafana.admin_user }}"
    password: "{{ grafana.admin_password }}"
    force_basic_auth: yes
    status_code: [200, 404]
  register: datasource_check
  failed_when: false

- name: Create Prometheus datasource in Grafana
  uri:
    url: "http://localhost:3000/api/datasources"
    method: POST
    user: "{{ grafana.admin_user }}"
    password: "{{ grafana.admin_password }}"
    body_format: json
    body:
      name: "Prometheus"
      type: "prometheus"
      url: "http://prometheus:9090"
      access: "proxy"
      isDefault: true
    force_basic_auth: yes
    status_code: 200
  when: datasource_check.status == 404
```

## Files Created/Modified

### New Files
```
ansible-configurations/playbooks/roles/prometheus/
├── defaults/main.yml
├── handlers/main.yml
├── meta/main.yml
├── tasks/main.yml
└── templates/
    ├── docker-compose.yml.j2
    ├── prometheus.yml.j2
    └── prometheus.service.j2
```

### Modified Files
1. **`inventory/group_vars/all.yml`**
   - Add prometheus and node_exporter config blocks

2. **`playbooks/main.yml`**
   - Add prometheus role with tags: `[prometheus, monitoring]`
   - Update post_tasks message

3. **`.env.example`**
   - Add PROMETHEUS_RETENTION example

### Files on Raspberry Pi
```
/home/<user>/prometheus/
├── docker-compose.yml
├── prometheus.yml
└── data/          # Prometheus TSDB

/etc/systemd/system/
└── prometheus.service
```

## Success Criteria (Phase 2)

1. ✅ Prometheus container running
2. ✅ Node Exporter container running
3. ✅ Prometheus scraping Node Exporter (target UP)
4. ✅ Metrics queryable in Prometheus UI
5. ✅ Prometheus auto-configured as Grafana data source
6. ✅ Grafana can query metrics immediately
7. ✅ Systemd service enabled and working
8. ✅ Survives Raspberry Pi reboot
9. ✅ 15-day retention configured
10. ✅ Integrated with one-script setup

## Open Questions

### Question 7: Node Exporter Metrics Filtering
Should we exclude certain filesystems or collectors?

Current exclusion: `^/(sys|proc|dev|host|etc)($$|/)`

**Do you need custom exclusions?**

### Question 8: Additional Scrape Targets
Will you add more targets later (e.g., application metrics)?

**Option A:** Basic config now (just node-exporter)
**Option B:** Add placeholder config for future targets

**Recommendation:** Option A
**Your preference?**

### Question 9: Prometheus Remote Storage
Do you need long-term storage beyond 15 days?

**Option A:** Local only (15 days)
**Option B:** Add remote write config for long-term storage (Thanos, Cortex, Mimir)

**Recommendation:** Option A for Phase 2
**Your preference?**

### Question 10: Dashboard Pre-installation
Should we auto-import Node Exporter Full dashboard (ID: 1860)?

**Option A:** Auto-import via Grafana API
- Dashboard ready immediately
- One more API call

**Option B:** User imports manually
- Documented in guide
- User chooses dashboard

**Recommendation:** Option B (keep it simple)
**Your preference?**

## Next Steps

After you answer the questions, I'll:
1. Create the prometheus role
2. Update configuration files
3. Test deployment
4. Update documentation

**Ready to proceed?**
