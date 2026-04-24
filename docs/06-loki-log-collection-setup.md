# Feature Plan: Loki Log Collection Setup (Phase 4)

## Overview

Deploy Loki (log storage) and Grafana Alloy (log collector) using Ansible, with automated Grafana data source and dashboard provisioning. This provides centralized log aggregation and visualization for systemd, Docker, and system logs.

**This is Phase 4:** Add log collection to complete observability stack (after Grafana, Prometheus, and metric alerts).

**What this implements:**
- Loki deployment for log storage (configurable retention)
- Grafana Alloy deployment for log collection
- Log sources: systemd journal, Docker containers, /var/log files
- Loki data source auto-configured in Grafana
- Pre-built log dashboards auto-imported
- Alloy UI exposed via Cloudflare tunnel

## Problem Being Solved

**Current State:**
- Metrics collected (Prometheus) and visualized (Grafana)
- Metric-based alerts configured
- Logs scattered across Docker containers, systemd journal, /var/log
- No centralized log aggregation or search
- Cannot correlate logs with metrics during incidents

**Desired State:**
- Centralized log storage in Loki
- All logs collected automatically via Alloy
- Logs queryable from Grafana UI
- Log dashboards for visualization
- Correlation between metrics and logs
- Configurable retention (default 7 days)

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   LOGS + METRICS STACK                         │
└────────────────────────────────────────────────────────────────┘

  🌍 You → https://grafana.iac-toolbox.com
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  Grafana (Port 3000)                            │
  │  • Queries Prometheus (metrics)                 │
  │  • Queries Loki (logs)                          │
  │  • Dashboards with metrics + logs               │
  └────────┬────────────────────────┬─────────────── ┘
           │                        │
           │ Metrics                │ Logs
           ▼                        ▼
  ┌─────────────────┐      ┌─────────────────────┐
  │  Prometheus     │      │  Loki (Port 3100)   │
  │  (Port 9090)    │      │  • Stores logs      │
  │                 │      │  • Configurable     │
  │                 │      │    retention        │
  └─────────────────┘      └─────────▲───────────┘
                                     │
                                     │ Ships logs
                          ┌──────────┴──────────┐
                          │  Grafana Alloy      │
                          │  (Port 12345)       │
                          │  • Collects logs    │
                          │  • Tags & filters   │
                          └─────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
           systemd journal    Docker containers    /var/log files
           • Service logs     • stdout/stderr      • auth.log
           • Boot events      • All containers     • syslog
           • OOM kills
```

## Design Decisions

### 1. Deployment Method ✅ DECIDED
**SELECTED: Ansible role for full stack**
- Create single `loki` role that deploys Loki + Alloy + Grafana configuration
- Matches existing Grafana/Prometheus pattern
- Uses Grafana API to configure data source and dashboards
- No Terraform needed for this phase (alerts in Phase 5)

### 2. Log Collection Sources ✅ DECIDED
**SELECTED: Collect all three sources**
- systemd journal (service logs, OOM kills, boot events)
- Docker containers (all container stdout/stderr)
- /var/log files (auth.log, syslog)
- Configurable filtering via template (can exclude noisy containers)

### 3. Log Retention ✅ DECIDED
**SELECTED: Configurable via iac-toolbox.yml**
- Default: `loki.retention_hours: 168` (7 days)
- User configurable: 72h (3d), 168h (7d), 336h (14d), 720h (30d)
- Matches Prometheus retention pattern

### 4. Grafana Integration ✅ DECIDED
**SELECTED: Automated via Grafana API**
- Ansible tasks configure Loki data source via API
- Dashboards provisioned via API
- Similar to Prometheus data source provisioning
- No manual UI configuration needed

### 5. Dashboard Source ✅ DECIDED
**SELECTED: Simple community dashboards**
- Import basic log viewer dashboards
- Essential features: log search, time range, filters
- Keep it performant and simple
- Users can build custom dashboards later

### 6. Alloy UI Access ✅ DECIDED
**SELECTED: Expose via Cloudflare tunnel**
- Accessible at `alloy.iac-toolbox.com`
- Useful for monitoring log collection status
- Secured by Cloudflare HTTPS

### 7. Network Configuration ✅ DECIDED
**SELECTED: Use existing monitoring network**
- Loki and Alloy join `monitoring` network
- Docker DNS resolution works automatically
- Same pattern as Grafana/Prometheus

---

## Implementation Approach

### Ansible Role: `loki`

Create `ansible-configurations/playbooks/roles/loki/` with structure:

```
roles/loki/
├── tasks/
│   └── main.yml           # Deployment + Grafana configuration
├── templates/
│   ├── docker-compose.yml.j2      # Loki + Alloy services
│   ├── loki-config.yml.j2         # Loki configuration
│   ├── alloy-config.alloy.j2      # Alloy collection config
│   └── loki.service.j2            # Systemd service
├── defaults/
│   └── main.yml           # Default variables
├── handlers/
│   └── main.yml           # Service restart handlers
└── meta/
    └── main.yml           # Dependencies (docker, grafana)
```

## Configuration Variables

### Add to `iac-toolbox.yml`:

```yaml
# Loki Log Aggregation Configuration
loki:
  enabled: true
  version: "latest"
  base_dir: "/home/{{ ansible_user }}/loki"
  port: 3100
  retention_hours: 168  # 7 days (72=3d, 168=7d, 336=14d, 720=30d)
  
alloy:
  enabled: true
  version: "latest"
  port: 12345
  domain: "alloy.iac-toolbox.com"

# Update Cloudflare domains
cloudflare:
  domains:
    # ... existing domains ...
    - hostname: alloy.iac-toolbox.com
      service_port: 12345
```

## File Templates

### 1. Loki Configuration (`loki-config.yml.j2`)

```yaml
auth_enabled: false

server:
  http_listen_port: {{ loki.port }}

common:
  ring:
    kvstore:
      store: inmemory
  replication_factor: 1
  path_prefix: /loki

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
  filesystem:
    directory: /loki/chunks

ingester:
  chunk_idle_period: 5m
  chunk_retain_period: 30s
  max_chunk_age: 1h
  wal:
    dir: /loki/wal

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: {{ loki.retention_hours }}h
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  retention_period: {{ loki.retention_hours }}h

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: filesystem
```

**Key changes from older Loki versions:**
- Uses TSDB (Time Series Database) instead of boltdb-shipper
- Schema v13 (latest)
- Added `common` section for shared config
- Added `compactor` with `delete_request_store` for retention
- Added WAL (Write-Ahead Log) for ingester

### 2. Alloy Configuration (`alloy-config.alloy.j2`)

```hcl
// Scrape systemd journal
loki.source.journal "systemd" {
  max_age       = "24h"
  forward_to    = [loki.write.local.receiver]
  labels        = {
    job  = "systemd",
    host = "{{ ansible_hostname }}",
  }
}

// Scrape Docker container logs
loki.source.docker "containers" {
  host       = "unix:///var/run/docker.sock"
  targets    = []
  forward_to = [loki.write.local.receiver]
  labels     = {
    job  = "docker",
    host = "{{ ansible_hostname }}",
  }
}

// Scrape /var/log files
local.file_match "system_logs" {
  path_targets = [
    {
      __address__ = "localhost",
      __path__    = "/var/log/syslog",
      job         = "syslog",
      host        = "{{ ansible_hostname }}",
    },
    {
      __address__ = "localhost",
      __path__    = "/var/log/auth.log",
      job         = "auth",
      host        = "{{ ansible_hostname }}",
    },
  ]
}

loki.source.file "system_logs" {
  targets    = local.file_match.system_logs.targets
  forward_to = [loki.write.local.receiver]
}

// Send all logs to Loki
loki.write "local" {
  endpoint {
    url = "http://loki:{{ loki.port }}/loki/api/v1/push"
  }
}
```

### 3. Docker Compose (`docker-compose.yml.j2`)

```yaml
services:
  loki:
    image: grafana/loki:{{ loki.version }}
    container_name: loki
    restart: unless-stopped
    ports:
      - "{{ loki.port }}:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - monitoring

  alloy:
    image: grafana/alloy:{{ alloy.version }}
    container_name: alloy
    restart: unless-stopped
    ports:
      - "{{ alloy.port }}:12345"
    volumes:
      - ./alloy-config.alloy:/etc/alloy/config.alloy:ro
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /run/log/journal:/run/log/journal:ro
      - /etc/machine-id:/etc/machine-id:ro
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    depends_on:
      - loki
    networks:
      - monitoring

volumes:
  loki_data:

networks:
  monitoring:
    name: monitoring
    external: true
```

### 4. Systemd Service (`loki.service.j2`)

```ini
[Unit]
Description=Loki Log Aggregation Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory={{ loki.base_dir }}
User={{ ansible_user }}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

## Ansible Role Tasks

### `roles/loki/tasks/main.yml` sequence:

1. **Verify dependencies**
   - Docker running
   - Grafana accessible

2. **Create directory structure**
   - `{{ loki.base_dir }}`

3. **Deploy configuration files**
   - loki-config.yml
   - alloy-config.alloy
   - docker-compose.yml

4. **Create monitoring network** (if not exists)

5. **Pull container images**
   - grafana/loki
   - grafana/alloy

6. **Deploy systemd service**

7. **Start Loki stack**

8. **Wait for Loki ready**
   - Check `/ready` endpoint

9. **Configure Grafana data source** (via API)
   - Create Loki data source
   - URL: `http://loki:3100`

10. **Import log dashboards** (via API)
    - Fetch dashboard JSON from Grafana.com
    - Import via Grafana dashboard import API
    - Map Loki data source

## Ansible Tasks Detail

### Grafana Data Source Tasks (add to `tasks/main.yml`)

```yaml
# After Loki is healthy...

- name: Wait for Loki to be ready
  uri:
    url: "http://localhost:{{ loki.port }}/ready"
    method: GET
    status_code: 200
  register: loki_health
  retries: 30
  delay: 2
  until: loki_health.status == 200

- name: Check if Loki datasource exists in Grafana
  uri:
    url: "http://localhost:{{ grafana.port }}/api/datasources/name/Loki"
    user: "{{ grafana.admin_user }}"
    password: "{{ grafana.admin_password }}"
    force_basic_auth: yes
    status_code: [200, 404]
  register: loki_datasource_check
  failed_when: false

- name: Create Loki datasource in Grafana
  uri:
    url: "http://localhost:{{ grafana.port }}/api/datasources"
    method: POST
    user: "{{ grafana.admin_user }}"
    password: "{{ grafana.admin_password }}"
    body_format: json
    body:
      name: "Loki"
      type: "loki"
      url: "http://loki:{{ loki.port }}"
      access: "proxy"
      jsonData:
        maxLines: 1000
    force_basic_auth: yes
    status_code: 200
  when: loki_datasource_check.status == 404
  register: loki_datasource_created

- name: Display datasource creation message
  debug:
    msg: "Loki datasource has been created in Grafana"
  when: loki_datasource_created is changed
```

### Dashboard Import Tasks (add to `tasks/main.yml`)

```yaml
# After Loki data source creation...

- name: Get Loki Log Dashboard JSON from Grafana.com
  uri:
    url: "https://grafana.com/api/dashboards/13639"  # Loki Dashboard - simple log viewer
    method: GET
    return_content: yes
  register: loki_dashboard_json

- name: Import Loki Log Dashboard
  uri:
    url: "http://localhost:{{ grafana.port }}/api/dashboards/import"
    method: POST
    user: "{{ grafana.admin_user }}"
    password: "{{ grafana.admin_password }}"
    body_format: json
    body:
      dashboard: "{{ loki_dashboard_json.json.json }}"
      overwrite: true
      inputs:
        - name: "DS_LOKI"
          type: "datasource"
          pluginId: "loki"
          value: "Loki"
    force_basic_auth: yes
    status_code: 200
  register: dashboard_imported

- name: Display dashboard import message
  debug:
    msg: "Loki dashboard imported at: http://localhost:{{ grafana.port }}{{ dashboard_imported.json.importedUrl }}"
  when: dashboard_imported is changed
```

**Dashboard ID 13639**: "Loki Dashboard - simple log viewer" from Grafana.com
- Basic log search interface
- Time range selector
- Log level filters
- Simple and performant

Alternative dashboard options:
- **12611**: "Loki & Promtail" (more detailed)
- **13407**: "Loki Logs" (advanced features)

## Implementation Steps

### Phase 1: Create Ansible Role Structure
1. Create `roles/loki/` directory
2. Create subdirectories (tasks, templates, defaults, handlers, meta)
3. Write `defaults/main.yml`
4. Write `meta/main.yml` (depends on docker, grafana)
5. Write `handlers/main.yml`

### Phase 2: Create Templates
1. Write `loki-config.yml.j2`
2. Write `alloy-config.alloy.j2`
3. Write `docker-compose.yml.j2`
4. Write `loki.service.j2`

### Phase 3: Write Ansible Tasks
1. Write `tasks/main.yml` with all deployment logic
2. Include Grafana API tasks for data source
3. Include Grafana API tasks for dashboards

### Phase 4: Update Configuration
1. Update `iac-toolbox.yml`
   - Add loki configuration
   - Add alloy configuration
   - Add alloy domain to cloudflare
2. Update `playbooks/main.yml`
   - Add loki role after prometheus
   - Tags: `[loki, logs, monitoring]`
3. Update post_tasks with access info

### Phase 5: Testing
1. Deploy: `./scripts/setup.sh --tags loki`
2. Verify containers running
3. Check systemd service enabled
4. Test log queries in Grafana Explore
5. Verify dashboards imported
6. Test Alloy UI access

## Files Created/Modified

### New Files
```
ansible-configurations/playbooks/roles/loki/
├── defaults/main.yml
├── handlers/main.yml
├── meta/main.yml
├── tasks/main.yml
└── templates/
    ├── docker-compose.yml.j2
    ├── loki-config.yml.j2
    ├── alloy-config.alloy.j2
    └── loki.service.j2
```

### Modified Files
1. `iac-toolbox.yml` - Add loki/alloy config + cloudflare domain
2. `playbooks/main.yml` - Add loki role

### Files on Raspberry Pi
```
/home/pi/loki/
├── docker-compose.yml
├── loki-config.yml
├── alloy-config.alloy
└── data/

/etc/systemd/system/
└── loki.service
```

## Success Criteria

1. ✅ Loki container running
2. ✅ Alloy container running
3. ✅ Systemd service enabled
4. ✅ Loki data source in Grafana
5. ✅ Can query systemd logs: `{job="systemd"}`
6. ✅ Can query Docker logs: `{job="docker"}`
7. ✅ Can query auth logs: `{job="auth"}`
8. ✅ Log dashboards visible in Grafana
9. ✅ Alloy UI accessible at alloy.iac-toolbox.com
10. ✅ Logs persist across restarts
11. ✅ Integrated with main playbook

## How to Use Logs in Grafana

### Method 1: Explore View (Recommended for Ad-hoc Queries)

**Best for:** Searching logs, debugging issues, investigating specific events

**URL:** `https://grafana.iac-toolbox.com/explore`

**Steps:**
1. Click **Explore** (compass icon) in left sidebar
2. Select **Loki** from data source dropdown (top)
3. Enter a query in the query builder
4. Click **Run query**

**Example Queries:**

```
# All systemd logs (service logs, boot events, OOM kills)
{job="systemd"}

# All Docker container logs
{job="docker"}

# Specific container logs
{job="docker", container_name="grafana"}
{job="docker", container_name="loki"}
{job="docker", container_name="prometheus"}

# Authentication logs (SSH attempts)
{job="auth"}

# System logs
{job="syslog"}

# Search for errors in systemd
{job="systemd"} |= "error"

# Search for failed SSH login attempts
{job="auth"} |= "Failed password"

# Search for OOM kills
{job="systemd"} |= "Out of memory"

# Combine filters
{job="docker", container_name="grafana"} |= "error"
```

**Query Syntax:**
- `{job="systemd"}` - Label matchers (filters)
- `|= "error"` - Contains text "error"
- `!= "debug"` - Does NOT contain "debug"
- `|~ "error|fail"` - Regex match

### Method 2: Logs Dashboard

**Best for:** Overview of all log streams, general monitoring

**URL:** `https://grafana.iac-toolbox.com/d/sadlil-loki-apps-dashboard/logs-app`

**How to access:**
1. Go to **Dashboards** (left sidebar)
2. Find **"Logs / App"** dashboard
3. Click to open

**Dashboard features:**
- Shows all log sources (systemd, Docker, auth, syslog)
- Filter by job (systemd, docker, auth, syslog)
- Time range selector
- Log level filters
- Search within logs

**Using the dashboard:**
1. Use the **job** dropdown to filter by source:
   - Select "systemd" for system service logs
   - Select "docker" for container logs
   - Select "auth" for SSH/authentication logs
   - Select "syslog" for system logs

2. Use the **time range** picker (top right) to select period

3. Use the **search box** to filter log lines

### Method 3: Split View (Correlate Logs with Metrics)

**Best for:** Troubleshooting - see metrics and logs side-by-side

1. In Grafana Explore, click **Split** (top right)
2. Left panel: Select **Prometheus**, query CPU:
   ```
   100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
3. Right panel: Select **Loki**, query logs:
   ```
   {job="systemd"}
   ```
4. Sync time ranges

Now you can see CPU spikes on the left and corresponding logs on the right!

### Common Use Cases

**1. Find service restart events:**
```
{job="systemd"} |= "Started" or "Stopped"
```

**2. Find container crashes:**
```
{job="docker"} |= "Exited"
```

**3. Monitor authentication attempts:**
```
{job="auth"} |= "Accepted" or "Failed"
```

**4. Check specific time period:**
- Use time range picker in top-right
- Or add to query: `{job="systemd"} [5m]` for last 5 minutes

**5. Count occurrences:**
```
count_over_time({job="auth"} |= "Failed password" [1h])
```

Shows number of failed login attempts in last hour.

## Practical Example: Monitoring Your Applications

### Example: Viewing Docker Application Logs (my-app container)

Let's use a real application container as an example. The **my-app** container (FastAPI/Uvicorn web app) is running on your system.

#### Query my-app container logs:

**View all my-app logs:**
```
{job="docker", container_name="my-app"}
```

**Search for HTTP requests:**
```
{job="docker", container_name="my-app"} |= "POST" or "GET"
```

**Search for errors in my-app:**
```
{job="docker", container_name="my-app"} |= "error" or "ERROR"
```

**Search for specific HTTP status codes:**
```
{job="docker", container_name="my-app"} |= "404" or "500"
```

**Monitor my-app startup/shutdown:**
```
{job="docker", container_name="my-app"} |= "Started server" or "Shutdown"
```

**Find slow requests (if logged):**
```
{job="docker", container_name="my-app"} |~ "duration.*[5-9][0-9]{3}ms"
```

#### If your app runs as a systemd service:

**Query service logs by name:**
```
{job="systemd"} |~ "your-service-name"
```

**Find service starts/stops:**
```
{job="systemd"} |~ "your-service-name" |= "Started" or "Stopped"
```

**Check service errors:**
```
{job="systemd"} |~ "your-service-name" |= "error" or "failed"
```

#### Finding Your Service Name

Not sure what your service is called in logs? Use these queries to discover it:

**List all Docker containers:**
```
{job="docker"}
```
Then look at the `container_name` label in the results.

**List all systemd services:**
```
{job="systemd"}
```
Then look for your service name in the log lines.

#### Advanced: Combining Queries

**my-app + Resource Usage:**
1. Open Grafana Explore in Split View
2. Left panel (Prometheus):
   ```
   rate(container_cpu_usage_seconds_total{name="my-app"}[5m])
   ```
3. Right panel (Loki):
   ```
   {job="docker", container_name="my-app"}
   ```

Now you can correlate CPU usage spikes with application events!

#### Creating Alerts for Your Application

You can create log-based alerts (covered in Phase 5):

**Alert when my-app crashes:**
```
count_over_time({job="docker", container_name="my-app"} |= "fatal" [5m]) > 0
```

**Alert when errors exceed threshold:**
```
count_over_time({job="docker", container_name="my-app"} |= "error" [5m]) > 10
```

**Alert on HTTP 500 errors:**
```
count_over_time({job="docker", container_name="my-app"} |= "500" [5m]) > 5
```

### Tips for Your Applications

1. **Use consistent log formats**: JSON logs are easier to parse and filter
2. **Include log levels**: ERROR, WARN, INFO, DEBUG
3. **Add context**: Include timestamps, request IDs, user IDs
4. **Use structured logging**: Key-value pairs are searchable

Example good log format:
```
{"level":"error","service":"my-app","msg":"Request failed","path":"/v1/agent/run","status":500,"error":"database timeout"}
```

This can be queried with:
```
{job="docker", container_name="my-app"} | json | level="error" | status="500"
```

## Troubleshooting

### No logs in Grafana

Check Alloy collecting:
```bash
docker logs alloy | grep "push request"
```

Check Loki receiving:
```bash
curl http://localhost:3100/loki/api/v1/label
```

### Loki data source connection failed

Verify Loki running:
```bash
docker ps | grep loki
curl http://localhost:3100/ready
```

### Alloy can't access sources

Check permissions:
```bash
docker exec alloy ls /var/run/docker.sock
docker exec alloy ls /run/log/journal
docker exec alloy ls /var/log/syslog
```

## Next Steps

- **Add custom application logs**: See [07-adding-custom-application-logs.md](07-adding-custom-application-logs.md) for systemd services and file-based logging
- **Set up log-based alerts**: See [08-log-based-alerts-automation.md](08-log-based-alerts-automation.md) for OOM, SSH failures, etc.

## Summary

This plan implements centralized log collection using Ansible:

**What gets deployed:**
- ✅ Loki (log storage, configurable retention)
- ✅ Alloy (log collection from 3 sources)
- ✅ Loki data source in Grafana (via API)
- ✅ Simple log dashboards (via API)
- ✅ Alloy UI via Cloudflare

**Log sources:**
- systemd journal
- Docker containers
- /var/log files

**Deployment:**
```bash
./scripts/setup.sh                 # Full stack
./scripts/setup.sh --tags loki     # Logs only
```

**Next phase:** Log-based alerts (Terraform)
