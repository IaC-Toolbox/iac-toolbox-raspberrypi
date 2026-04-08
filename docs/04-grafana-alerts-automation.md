# Feature Plan: Grafana Alerts Automation (Phase 3)

## Overview

Automate the provisioning of Grafana alert rules using Terraform, integrated into the one-script setup. This adds automated alerting for system resources and hardware monitoring to complete the observability stack.

**This is Phase 3:** Deploy alert rules automatically after Grafana and Prometheus are running.

**Alerts Implemented:**
1. **High CPU Usage** - Warns when CPU exceeds 5% (testing) / 85% (production)
2. **High Memory Usage** - Warns when memory usage exceeds 90%
3. **Low Disk Space** - Warns when disk usage exceeds 80%
4. **Device Offline** - Critical alert when Raspberry Pi unreachable for 5+ minutes
5. **High CPU Temperature** - Critical alert when CPU temperature exceeds 75°C

## Problem Being Solved

**Current State:**
- Grafana and Prometheus collecting metrics
- Dashboards visualizing data
- No automated alerts when things go wrong
- Manual alert creation via UI is tedious and error-prone

**Desired State:**
- Alert rules defined as code (Terraform)
- Automatically provisioned during setup
- Version controlled in git
- CPU, memory, disk, device offline, and temperature alerts configured
- Email notifications (with option for PagerDuty later)
- Integrated with one-script setup

## Design Decisions

### Question 1: Terraform vs Ansible? ✅ DECIDED
**SELECTED: Option A - Use Terraform**
- Grafana provider is mature and purpose-built for alert management
- Declarative infrastructure for alert rules
- Ansible handles infrastructure, Terraform handles Grafana configuration
- Clean separation of concerns

### Question 2: Where to Run Terraform? ✅ DECIDED
**SELECTED: Option A - On local machine**
- Terraform runs on the same machine that runs Ansible (Mac/Linux)
- Executes after Ansible completes infrastructure deployment
- Keeps Raspberry Pi lightweight (no Terraform installation needed)
- State stored locally on control machine

### Question 3: Terraform State Storage? ✅ DECIDED
**SELECTED: Option A - Local state file**
- State stored in `terraform/.terraform.tfstate`
- Added to .gitignore to prevent committing sensitive data
- Simple for homelab use case
- User responsible for manual backup
- Can migrate to Terraform Cloud later if needed

### Question 4: Alert Thresholds - Configurable or Fixed? ✅ DECIDED
**SELECTED: Option B - Fixed in Terraform code**
- Hardcoded thresholds: CPU 85%, Memory 90%, Disk 80%
- User edits Terraform files directly to customize
- Simpler setup (fewer .env variables)
- Good defaults for most homelab use cases

### Question 5: Email Configuration ✅ DECIDED
**SELECTED: Option B - Just email address**
- Only `ALERT_EMAIL` in .env
- User configures SMTP manually in Grafana UI if needed
- Simpler initial setup
- Assumes user will configure email delivery themselves
- For testing: verify alerts exist in Grafana, no email validation needed

### Question 6: Directory Structure ✅ DECIDED
**SELECTED: Option B - Separate top-level terraform/**
```
project-root/
├── ansible-configurations/
└── terraform/
    └── grafana-alerts/
        ├── providers.tf
        ├── variables.tf
        ├── datasources.tf
        ├── alerts.tf
        └── .gitignore
```
- Clear separation between Ansible and Terraform code
- Easier to navigate and understand project structure
- Allows for future Terraform modules to be added at same level

### Question 7: Integration with setup.sh ✅ DECIDED
**SELECTED: Option A - Automatic with flags**
- Default behavior: `./scripts/setup.sh` runs both Ansible AND Terraform
- Optional flags for granular control:
  - `--ansible-only` - Run only Ansible playbook
  - `--terraform-only` - Run only Terraform (requires Ansible already deployed)
  - No flags = Run both in sequence
- Complete setup by default, but allows targeted updates
- Example usage:
  ```bash
  ./scripts/setup.sh                    # Full deployment
  ./scripts/setup.sh --ansible-only     # Infrastructure only
  ./scripts/setup.sh --terraform-only   # Alerts only
  ```

### Question 8: PagerDuty/Slack Support ✅ DECIDED
**SELECTED: Option A - Email only (MVP)**
- Ship with email alerts only in Phase 3
- PagerDuty integration planned for later phase
- OUT OF SCOPE for current implementation
- Documentation will include how to extend for other notification channels
- Keeps this phase focused and deliverable

### Question 9: Alert Testing ✅ DECIDED
**SELECTED: Option A - Manual verification with simulation**
- Deploy and verify alerts exist in Grafana UI folder
- No automated email testing (avoid false alerts)
- Manual simulation test procedure:
  1. Lower threshold temporarily in `terraform/grafana-alerts/alerts.tf` (e.g., CPU to 5%)
  2. Apply changes: `cd terraform/grafana-alerts && terraform apply -auto-approve`
  3. Wait 5 minutes for evaluation interval (alert fires after 5m)
  4. Verify alert fires in Grafana UI at `https://grafana.iac-toolbox.com/alerting/list`
  5. Check alert appears in "Firing" state with correct labels and annotations
  6. Restore original thresholds (CPU: 85%, Memory: 90%, Disk: 80%)
  7. Apply restored config: `terraform apply -auto-approve`
- Focus on verifying alert creation and firing logic, not email delivery

### Question 10: Grafana Data Source - Create or Reference? ✅ DECIDED
**SELECTED: Option B - Terraform references by name**
- Use `data "grafana_data_source"` to look up existing Prometheus data source
- No duplication or import complexity
- Ansible creates the data source, Terraform references it
- Clean separation: Ansible owns infrastructure, Terraform queries it
- Less complex, no state management for existing resources

---

## Implementation Approach (Based on Decisions)

Based on the confirmed decisions above, here's the implementation plan:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Setup Flow                                │
└─────────────────────────────────────────────────────────────┘

  User runs: ./scripts/setup.sh [--ansible-only | --terraform-only]
       │
       ├─► Ansible Playbook (default or --ansible-only)
       │    ├─► Deploy Docker
       │    ├─► Deploy Vault
       │    ├─► Deploy Grafana
       │    ├─► Deploy Prometheus + Node Exporter
       │    └─► Create Prometheus datasource in Grafana
       │
       └─► Terraform (default or --terraform-only)
            ├─► Reference existing Prometheus datasource
            ├─► Create alert folder
            ├─► Create contact point (email)
            ├─► Create notification policy
            └─► Create alert rules (CPU 5%, Memory 90%, Disk 80%, Offline 5m, Temp 75°C)
```

### Project Structure

```
iac-toolbox-raspberrypi/
├── ansible-configurations/
│   ├── .env                    # Add alert email config
│   └── playbooks/
│       └── roles/
│           └── grafana/
│               └── templates/
│                   └── docker-compose.yml.j2
├── terraform/
│   └── grafana-alerts/
│       ├── providers.tf
│       ├── variables.tf
│       ├── terraform.tfvars (generated)
│       ├── datasources.tf
│       ├── alerts.tf
│       └── .gitignore
└── scripts/
    └── setup.sh                # Updated with flags and Terraform execution
```

### Configuration (.env additions)

```bash
# Existing configs
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=...

# New alert config (email only)
ALERT_EMAIL=your-email@example.com

# Note: Alert thresholds are hardcoded in terraform/grafana-alerts/alerts.tf
# System Resources: CPU: 5% (testing), Memory: 90%, Disk: 80%
# Hardware: Device Offline: 5m, CPU Temperature: 75°C
# Edit alerts.tf to customize thresholds
# SMTP configuration should be done manually in Grafana UI if needed
```

### Grafana Docker Compose Updates

No changes required to Grafana docker-compose.yml.j2:
- Grafana already deployed with existing configuration
- SMTP will be configured manually by user in Grafana UI if email delivery needed
- Alert contact points created by Terraform will reference email address from .env

### Terraform Files

#### providers.tf
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = "${var.grafana_admin_user}:${var.grafana_admin_password}"
}
```

#### variables.tf
```hcl
variable "grafana_url" {
  type        = string
  description = "Grafana URL (e.g., https://grafana.iac-toolbox.com)"
}

variable "grafana_admin_user" {
  type        = string
  description = "Grafana admin username"
  default     = "admin"
}

variable "grafana_admin_password" {
  type        = string
  description = "Grafana admin password"
  sensitive   = true
}

variable "alert_email" {
  type        = string
  description = "Email address for alert notifications"
}

# Note: Alert thresholds are hardcoded in alerts.tf
# System: CPU: 5% (testing), Memory: 90%, Disk: 80%
# Hardware: Offline: 5m, Temperature: 75°C
```

#### datasources.tf (references existing)
```hcl
data "grafana_data_source" "prometheus" {
  name = "Prometheus"
}
```

#### alerts.tf
Contains 5 alert rules in the "Homelab System Alerts" rule group:

1. **High CPU Usage** (warning)
   - Threshold: 5% (for testing - change to 85% for production)
   - Evaluates: `100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
   - Fires after: 5 minutes above threshold

2. **High Memory Usage** (warning)
   - Threshold: 90%
   - Evaluates: `(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100`
   - Fires after: 5 minutes above threshold

3. **Low Disk Space** (warning)
   - Threshold: 80%
   - Evaluates: `(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100`
   - Mount point: `/` (root filesystem)
   - Fires after: 5 minutes above threshold

4. **Device Offline** (critical)
   - Threshold: Device unreachable for 5+ minutes
   - Evaluates: `up{job="node_exporter"} < 1`
   - Fires immediately when device goes offline

5. **High CPU Temperature** (critical)
   - Threshold: 75°C
   - Evaluates: `node_hwmon_temp_celsius{chip="cpu_thermal"}`
   - Fires after: 5 minutes above threshold

### Setup Script Integration

Update `scripts/setup.sh` with optional flags and Terraform execution:

```bash
#!/bin/bash

# Parse command-line flags
RUN_ANSIBLE=true
RUN_TERRAFORM=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --ansible-only)
      RUN_TERRAFORM=false
      shift
      ;;
    --terraform-only)
      RUN_ANSIBLE=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--ansible-only | --terraform-only]"
      exit 1
      ;;
  esac
done

# Load environment variables
source ansible-configurations/.env

# Run Ansible if enabled
if [ "$RUN_ANSIBLE" = true ]; then
  echo "Running Ansible playbook..."
  ansible-playbook ansible-configurations/playbooks/main.yml
fi

# Run Terraform if enabled
if [ "$RUN_TERRAFORM" = true ]; then
  echo "Configuring Grafana alerts with Terraform..."
  cd terraform/grafana-alerts

  # Generate terraform.tfvars from .env
  cat > terraform.tfvars <<EOF
grafana_url = "https://grafana.iac-toolbox.com"
grafana_admin_user = "${GRAFANA_ADMIN_USER}"
grafana_admin_password = "${GRAFANA_ADMIN_PASSWORD}"
alert_email = "${ALERT_EMAIL}"
EOF

  # Run Terraform with auto-approve
  terraform init
  terraform apply -auto-approve

  cd ../..
fi

echo "Setup complete!"
```

**Key features:**
- Default: runs both Ansible and Terraform
- `--ansible-only`: infrastructure only
- `--terraform-only`: alerts only (requires Grafana already deployed)
- Uses `GRAFANA_ADMIN_USER` from .env (not hardcoded)
- Auto-approves Terraform (no manual confirmation needed)

## Implementation Steps

### Phase 1: Update .env.example ✅ COMPLETED
- Added `ALERT_EMAIL` variable
- Added `GRAFANA_ADMIN_USER` variable
- Documented all 5 alert thresholds (system resources + hardware monitoring)
- Documented that SMTP configured manually in UI

### Phase 2: Create Terraform Directory Structure ✅ COMPLETED
- Created `terraform/grafana-alerts/` directory at project root
- Created `.gitignore` to exclude state files and `.terraform/`

### Phase 3: Create Terraform Files ✅ COMPLETED
- Created `providers.tf` (Grafana provider configuration)
- Created `variables.tf` (grafana_url, admin credentials, alert_email)
- Created `datasources.tf` (reference existing Prometheus data source)
- Created `alerts.tf` with 5 alert rules:
  - **System resources:** High CPU (5% testing), High Memory (90%), Low Disk Space (80%)
  - **Hardware monitoring:** Device Offline (5m), High CPU Temperature (75°C)

### Phase 4: Update setup.sh Script ✅ COMPLETED
- Added command-line flag parsing (--ansible-only, --terraform-only, --help)
- Added Terraform installation check (Step 3/6)
- Added Terraform execution step (Step 7)
- Generate `terraform.tfvars` from .env using environment variables
- Run `terraform init` and `terraform apply -auto-approve`
- Added variable validation for Terraform requirements
- Handle errors gracefully with exit codes

### Phase 5: Testing 🔄 IN PROGRESS

#### Initial Deployment Test ✅ COMPLETED
- Deploy to test Pi using `./scripts/setup.sh`
- Verify alerts appear in Grafana UI in "Homelab Alerts" folder
- Verify 5 rules created (CPU, Memory, Disk, Offline, Temperature)
- Test with `--ansible-only` and `--terraform-only` flags
- Verify Terraform state management (check .tfstate file created)

#### Alert Firing Simulation Test
To verify alerts actually fire when thresholds are exceeded:

1. **Lower CPU threshold for testing:**
   ```bash
   # Edit terraform/grafana-alerts/alerts.tf
   # Change CPU threshold from 85 to 5 in the evaluator params
   # Line: params = [5]
   ```

2. **Apply the test configuration:**
   ```bash
   cd terraform/grafana-alerts
   terraform apply -auto-approve
   ```

3. **Wait for alert evaluation:**
   - Alert evaluates every 5 minutes (interval_seconds = 300)
   - Alert must be in firing state for 5 minutes before triggering (for = "5m")
   - Total wait time: ~10 minutes maximum

4. **Verify in Grafana UI:**
   - Navigate to: https://grafana.iac-toolbox.com/alerting/list
   - Check "High CPU Usage" alert appears in "Firing" state
   - Verify alert shows correct instance, value, and threshold
   - Check annotations display properly

5. **Restore production thresholds:**
   ```bash
   # Edit terraform/grafana-alerts/alerts.tf
   # Restore CPU threshold to 85
   # Line: params = [85]
   terraform apply -auto-approve
   ```

6. **Confirm alert clears:**
   - Wait 5 minutes
   - Verify alert returns to "Normal" state in Grafana UI

### Phase 6: Documentation
- Update README with alert configuration section
- Document how to customize thresholds (edit alerts.tf)
- Document flag usage for setup.sh
- Add troubleshooting guide for common Terraform errors
- Document manual SMTP configuration steps if user wants email delivery

## Success Criteria

1. ✅ Running `./scripts/setup.sh` provisions alerts automatically (both Ansible + Terraform)
2. ✅ Can run `./scripts/setup.sh --ansible-only` for infrastructure only
3. ✅ Can run `./scripts/setup.sh --terraform-only` for alerts only
4. ✅ Alert email configurable in `.env` (ALERT_EMAIL)
5. ✅ Alert thresholds hardcoded (CPU 85%, Memory 90%, Disk 80%)
6. ✅ Five alerts appear in Grafana UI in "Homelab Alerts" folder (CPU, Memory, Disk, Offline, Temperature)
7. ✅ Alerts reference existing Prometheus data source (created by Ansible)
8. ✅ Terraform state managed locally in `terraform/.terraform.tfstate`
9. ✅ No passwords or state files committed to git
10. ✅ Email contact point configured with email from .env
11. ✅ Notification policy set (4-hour repeat)
12. ✅ Setup script uses `GRAFANA_ADMIN_USER` from .env (not hardcoded)
13. ✅ Terraform runs with `-auto-approve` (no user confirmation needed)

## Files Created/Modified

### New Files
```
terraform/grafana-alerts/
├── providers.tf        # Grafana provider configuration
├── variables.tf        # Input variables (url, credentials, email)
├── datasources.tf      # Reference to existing Prometheus data source
├── alerts.tf           # Alert rules with hardcoded thresholds
└── .gitignore         # Exclude state files and .terraform/
```

### Modified Files
1. **`ansible-configurations/.env.example`** - Add `ALERT_EMAIL` variable and documentation
2. **`scripts/setup.sh`** - Add flags (--ansible-only, --terraform-only) and Terraform execution logic
3. **`README.md`** - Document alert configuration and usage

### No Changes Required
- **`playbooks/roles/grafana/templates/docker-compose.yml.j2`** - No SMTP env vars needed

### Generated Files (not in git, auto-created)
- `terraform/grafana-alerts/terraform.tfvars` - Generated from .env by setup.sh
- `terraform/grafana-alerts/terraform.tfstate` - Terraform state (local storage)
- `terraform/grafana-alerts/.terraform/` - Provider binaries and lock file

## Troubleshooting

### Alert Testing Issues

**Alert not firing after 10 minutes:**
- Check Prometheus is scraping metrics: https://grafana.iac-toolbox.com/explore
- Verify query returns data: Run the PromQL query from alerts.tf
- Check alert evaluation interval in Grafana UI (should be 5m)
- Ensure threshold is low enough (CPU should be above 5% naturally)

**Terraform apply fails with authentication error:**
- Verify `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in .env
- Test credentials: `curl -u admin:password https://grafana.iac-toolbox.com/api/health`
- Check Grafana is accessible at the configured URL

**Data source "Prometheus" not found:**
- Verify Prometheus data source exists in Grafana UI
- Check the name matches exactly: "Prometheus" (case-sensitive)
- Ensure Ansible deployed Grafana and created the data source first

**Alert shows "NoData" state:**
- Verify node_exporter is running on Raspberry Pi: `docker ps | grep node_exporter`
- Check Prometheus targets: https://prometheus.iac-toolbox.com/targets
- Verify metrics are being collected: Query `node_cpu_seconds_total` in Prometheus
- For temperature alert: Check if `node_hwmon_temp_celsius{chip="cpu_thermal"}` returns data

**Temperature alert not working:**
- Raspberry Pi exposes CPU temp via hwmon sensors
- Verify sensor available: Query `node_hwmon_temp_celsius` in Prometheus/Grafana
- If no data, check node_exporter version supports hwmon collector
- Alternative metric: `node_thermal_zone_temp{type="cpu-thermal"}` (older Pi models)

### Common Terraform Errors

**State file locked:**
```bash
# Remove lock if you're sure no other process is running
rm terraform/grafana-alerts/.terraform.tfstate.lock.info
```

**Provider version conflict:**
```bash
cd terraform/grafana-alerts
terraform init -upgrade
```

**Resource already exists:**
- This happens if alert created manually in UI
- Import existing resource or delete from UI first

## Future Enhancements (Phase 4)

### PagerDuty Integration
- Add `ALERT_PAGERDUTY_KEY` to .env
- Conditional contact point in Terraform
- If PagerDuty key present, use it instead of email

### Slack Integration
- Add `ALERT_SLACK_WEBHOOK` to .env
- Additional contact point
- Formatted Slack messages

### More Alert Rules
- Container down alerts
- High network errors
- Application-specific alerts

### Alert Silences
- Terraform resources for maintenance windows
- Silence specific instances during deploys

### Remote State
- Migrate to Terraform Cloud
- Team collaboration support

## Summary

This plan automates Grafana alert provisioning using Terraform, integrated into the one-script setup with optional flags for granular control.

**Key Features:**
- ✅ Terraform manages 5 alert rules as code (separate from Ansible)
- ✅ System resource monitoring: CPU (5% testing), Memory (90%), Disk (80%)
- ✅ Hardware monitoring: Device Offline (5m), CPU Temperature (75°C)
- ✅ Email address configured via `.env`, SMTP configured manually in UI if needed
- ✅ References existing Prometheus data source (created by Ansible)
- ✅ Integrated with `setup.sh` with optional flags
- ✅ Auto-approve mode (no manual confirmation)
- ✅ No manual UI configuration needed for alert rules
- ✅ Version controlled, reproducible

**Flow:**
1. User adds `ALERT_EMAIL` to `.env`
2. Runs `./scripts/setup.sh` (or with flags for targeted deployment)
3. Ansible deploys infrastructure (Grafana, Prometheus)
4. Terraform provisions alerts (folder, contact point, rules)
5. Email notifications configured with address from .env
6. Five alerts active and ready (CPU, memory, disk, offline, temperature)

**Tooling:**
- Ansible: Infrastructure deployment (Docker, Grafana, Prometheus, Vault)
- Terraform: Alert configuration (declarative, idempotent)
- setup.sh: Orchestrates both with optional flags

**Deployment Options:**
```bash
./scripts/setup.sh                    # Full stack (Ansible + Terraform)
./scripts/setup.sh --ansible-only     # Infrastructure only
./scripts/setup.sh --terraform-only   # Alerts only (update existing)
```

## Implementation Status

### ✅ COMPLETED
All phases of the implementation are complete:

1. ✅ Terraform directory structure created
2. ✅ All Terraform files written (providers.tf, variables.tf, datasources.tf, alerts.tf, .gitignore)
3. ✅ `.env.example` updated with alert configuration
4. ✅ `setup.sh` updated with flags and Terraform execution
5. 🔄 Testing in progress

### 🔄 Current Phase: Testing

**To complete testing:**
1. Wait ~10 minutes for CPU alert to fire (threshold set to 5%)
2. Verify alert appears in Grafana UI: https://grafana.iac-toolbox.com/alerting/list
3. Restore CPU threshold to 85% for production
4. Update README with usage documentation

**Implemented Features:**
- ✅ 5 alert rules (3 system resources + 2 hardware monitoring)
- ✅ Terraform at project root (`terraform/grafana-alerts/`)
- ✅ Setup script flags: --ansible-only, --terraform-only
- ✅ Auto-approve mode (no manual confirmation needed)
- ✅ Email contact point configured from .env
- ✅ All alerts visible in Grafana "Homelab Alerts" folder
