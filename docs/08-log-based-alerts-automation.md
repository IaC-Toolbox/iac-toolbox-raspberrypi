# Feature Plan: Log-based Alerts Automation (Phase 5)

## Overview

Automate the provisioning of log-based alert rules in Grafana using Terraform. This adds automated alerting for log patterns (OOM kills, failed logins, container crashes) to complete the observability stack.

**This is Phase 5:** Deploy log-based alerts after Loki log collection is operational.

**Alerts Implemented:**
1. **OOM Kill Detected** - Critical alert when out-of-memory kill occurs
2. **Excessive Failed SSH Logins** - Warning when >5 failed login attempts in 5 minutes
3. **Container Restart Storm** - Warning when container restarts repeatedly

## Problem Being Solved

**Current State (after Phase 4):**
- Loki collecting logs from systemd, Docker, /var/log
- Logs queryable via Grafana Explore
- Log dashboards showing historical logs
- No automated alerts on log patterns
- Manual log monitoring required

**Desired State:**
- Alert rules defined as code (Terraform)
- Automatically provisioned during setup
- Version controlled in git
- OOM kills, authentication failures, and container issues trigger alerts
- Use existing notification channels (email or PagerDuty)
- Integrated with one-script setup

## Design Decisions

### Question 1: Terraform vs Ansible? ✅ DECIDED
**SELECTED: Use Terraform**
- Matches existing alert automation pattern (grafana-alerts module)
- Grafana provider is mature
- Declarative infrastructure for alert rules
- Ansible handles infrastructure, Terraform handles alerts
- Consistent approach across metric and log alerts

### Question 2: Where to Put Terraform Code? ✅ DECIDED
**SELECTED: New module `terraform/grafana-logs-alerts/`**
- Separate from `terraform/grafana-alerts/` (metric alerts)
- Can be run independently
- Clear separation: metric alerts vs log alerts
- Both use same Grafana provider configuration

### Question 3: Notification Channels? ✅ DECIDED
**SELECTED: Reuse existing channels**
- Use same notification policy as metric alerts
- Email or PagerDuty (already configured)
- No duplicate contact points needed
- Consistent alert delivery

### Question 4: Alert Rule Group? ✅ DECIDED
**SELECTED: Separate rule group for log alerts**
- Group name: "Log-based Alerts"
- Separate from "Homelab System Alerts" (metrics)
- Easier to manage and update independently
- Same folder: "Homelab Alerts"

---

## Implementation Approach

### Terraform Module: `grafana-logs-alerts`

Create `terraform/grafana-logs-alerts/` with structure:

```
terraform/grafana-logs-alerts/
├── providers.tf           # Grafana provider
├── variables.tf           # Input variables
├── log_alerts.tf          # Log-based alert rules
└── .gitignore            # Exclude state files
```

## Configuration

### No changes to `.env`:
- Uses existing `GRAFANA_ADMIN_USER`
- Uses existing `GRAFANA_ADMIN_PASSWORD`
- Uses existing `ALERT_EMAIL` or `PAGERDUTY_TOKEN`
- No additional environment variables required

### No changes to `group_vars`:
- All configuration in Terraform files
- Alert thresholds hardcoded (like metric alerts)
- Edit Terraform files to customize

## Terraform Files

### 1. Providers Configuration (`providers.tf`)

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

### 2. Variables (`variables.tf`)

```hcl
variable "grafana_url" {
  type        = string
  description = "Grafana URL"
}

variable "grafana_admin_user" {
  type        = string
  description = "Grafana admin username"
}

variable "grafana_admin_password" {
  type        = string
  description = "Grafana admin password"
  sensitive   = true
}
```

### 3. Log-based Alerts (`log_alerts.tf`)

```hcl
# Reference existing alert folder
data "grafana_folder" "alerts" {
  title = "Homelab Alerts"
}

# Reference Loki data source
data "grafana_data_source" "loki" {
  name = "Loki"
}

# Log-based alert rule group
resource "grafana_rule_group" "log_alerts" {
  name             = "Log-based Alerts"
  folder_uid       = data.grafana_folder.alerts.uid
  interval_seconds = 300  # Evaluate every 5 minutes

  # Alert 1: OOM Kill Detected
  rule {
    name      = "OOM Kill Detected"
    condition = "C"
    for       = "5m"

    data {
      ref_id = "A"
      relative_time_range {
        from = 300  # Last 5 minutes
        to   = 0
      }
      datasource_uid = data.grafana_data_source.loki.uid
      model = jsonencode({
        expr  = "count_over_time({job=\"systemd\"} |= \"Out of memory\" [5m])"
        refId = "A"
      })
    }

    data {
      ref_id = "B"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "reduce"
        refId      = "B"
        expression = "A"
        reducer    = "last"
      })
    }

    data {
      ref_id = "C"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "threshold"
        refId      = "C"
        expression = "B"
        conditions = [{
          evaluator = {
            params = [1]
            type   = "gt"
          }
        }]
      })
    }

    annotations = {
      summary     = "OOM kill detected on {{ $labels.host }}"
      description = "Out of memory kill detected in systemd journal. Check memory usage and container limits."
    }

    labels = {
      severity = "critical"
    }
  }

  # Alert 2: Excessive Failed SSH Logins
  rule {
    name      = "Excessive Failed SSH Logins"
    condition = "C"
    for       = "5m"

    data {
      ref_id = "A"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = data.grafana_data_source.loki.uid
      model = jsonencode({
        expr  = "count_over_time({job=\"auth\"} |= \"Failed password\" [5m])"
        refId = "A"
      })
    }

    data {
      ref_id = "B"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "reduce"
        refId      = "B"
        expression = "A"
        reducer    = "last"
      })
    }

    data {
      ref_id = "C"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "threshold"
        refId      = "C"
        expression = "B"
        conditions = [{
          evaluator = {
            params = [5]
            type   = "gt"
          }
        }]
      })
    }

    annotations = {
      summary     = "Excessive failed SSH login attempts"
      description = "More than 5 failed SSH login attempts in 5 minutes. Possible brute force attack."
    }

    labels = {
      severity = "warning"
    }
  }
}
```

### 4. .gitignore

```
# Terraform
.terraform/
*.tfstate
*.tfstate.backup
terraform.tfvars
.terraform.lock.hcl
```

## Integration with setup.sh

Update `scripts/setup.sh` to run log alerts Terraform:

```bash
# After Terraform alerts section, add:

# Run Terraform for log-based alerts (NEW)
if [ "$RUN_TERRAFORM" = true ]; then
  echo "Configuring log-based alerts with Terraform..."
  cd terraform/grafana-logs-alerts
  
  # Generate terraform.tfvars from .env
  cat > terraform.tfvars <<EOF
grafana_url            = "https://grafana.iac-toolbox.com"
grafana_admin_user     = "${GRAFANA_ADMIN_USER}"
grafana_admin_password = "${GRAFANA_ADMIN_PASSWORD}"
EOF
  
  terraform init
  terraform apply -auto-approve
  cd ../..
fi
```

**New flag support:**
```bash
./scripts/setup.sh                      # Full stack
./scripts/setup.sh --log-alerts-only    # Just log alerts
```

## Implementation Steps

### Phase 1: Create Terraform Module
1. Create `terraform/grafana-logs-alerts/` directory
2. Write `providers.tf`
3. Write `variables.tf`
4. Write `log_alerts.tf` with 2 alert rules
5. Create `.gitignore`

### Phase 2: Update Setup Script
1. Update `scripts/setup.sh`:
   - Add `RUN_TERRAFORM_LOG_ALERTS` variable
   - Add `--log-alerts-only` flag parsing
   - Add Terraform execution for log alerts
   - Generate `terraform.tfvars` from .env

### Phase 3: Testing
1. Deploy: `./scripts/setup.sh --log-alerts-only`
2. Verify alerts exist in Grafana UI
3. Test OOM alert (stress test or simulate)
4. Test SSH alert (multiple failed logins)
5. Verify notifications sent

## Files Created/Modified

### New Files
```
terraform/grafana-logs-alerts/
├── providers.tf
├── variables.tf
├── log_alerts.tf
└── .gitignore
```

### Modified Files
1. `scripts/setup.sh` - Add log alerts Terraform execution

### Generated Files (not in git)
- `terraform/grafana-logs-alerts/terraform.tfvars`
- `terraform/grafana-logs-alerts/terraform.tfstate`
- `terraform/grafana-logs-alerts/.terraform/`

## Success Criteria

1. ✅ Terraform module creates successfully
2. ✅ Can run `./scripts/setup.sh --log-alerts-only`
3. ✅ 2 alert rules appear in Grafana "Log-based Alerts" group
4. ✅ Alerts visible in "Homelab Alerts" folder
5. ✅ Alerts reference Loki data source
6. ✅ Alerts use existing notification channels
7. ✅ OOM alert fires when memory kill occurs
8. ✅ SSH alert fires on >5 failed logins
9. ✅ Terraform state managed locally
10. ✅ No passwords committed to git

## Alert Testing

### Test OOM Alert
Simulate OOM condition:
```bash
# Lower threshold temporarily or run stress test
stress-ng --vm 1 --vm-bytes 1G --timeout 10s
```

Verify in Grafana: Alerting → Alert rules → "OOM Kill Detected"

### Test SSH Alert
Trigger failed logins:
```bash
# Run 6 failed SSH attempts
for i in {1..6}; do ssh baduser@localhost; done
```

Verify in Grafana: Alerting → Alert rules → "Excessive Failed SSH Logins"

## Troubleshooting

### Alert not firing

Check LogQL query manually in Grafana Explore:
```
count_over_time({job="systemd"} |= "Out of memory" [5m])
```

Verify it returns data when condition occurs.

### Data source not found

Verify Loki data source exists:
```bash
cd terraform/grafana-logs-alerts
terraform console
> data.grafana_data_source.loki.name
```

Should return "Loki".

## Summary

This plan adds log-based alerts using Terraform:

**What gets automated:**
- ✅ 2 log-based alert rules (OOM, SSH failures)
- ✅ Terraform manages as code
- ✅ Version controlled
- ✅ Uses existing notification channels
- ✅ Integrated with setup.sh

**Deployment:**
```bash
./scripts/setup.sh                      # Full stack
./scripts/setup.sh --log-alerts-only    # Just log alerts
```

**Pattern match:**
- Same approach as `grafana-alerts` (metric alerts)
- Separate Terraform module
- Independent deployment
- Consistent with existing architecture
