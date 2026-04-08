# Feature Plan: PagerDuty Integration (Phase 4)

## Overview

Replace email-based alert notifications with PagerDuty - a production-grade incident management platform that provides push notifications, phone calls, and incident tracking. This completes the observability stack with active alerting that wakes you up when something goes wrong.

**This is Phase 4:** Integrate PagerDuty after alerts are working with email notifications.

**Alerts to PagerDuty:**
- All 5 existing alerts route to PagerDuty
- High CPU Usage (warning) → PagerDuty incident
- High Memory Usage (warning) → PagerDuty incident
- Low Disk Space (warning) → PagerDuty incident
- Device Offline (critical) → PagerDuty incident
- High CPU Temperature (critical) → PagerDuty incident

## Problem Being Solved

**Current State:**
- Email contact point configured
- Alerts fire in Grafana UI
- Email notifications (if SMTP configured)
- Passive monitoring - you have to check email

**Desired State:**
- PagerDuty contact point replaces email
- Push notifications to mobile device
- Incident tracking and lifecycle management
- Active alerting - PagerDuty keeps escalating until acknowledged
- Full audit trail of incidents

## Design Decisions

### Decision 1: PagerDuty vs Email Strategy ✅ DECIDED
**SELECTED: Replace email entirely with PagerDuty**
- When PAGERDUTY_TOKEN is configured, use PagerDuty contact point
- When PAGERDUTY_TOKEN is not set, fall back to email contact point
- No hybrid routing - simplifies notification policy
- All 5 alerts go to single contact point

### Decision 2: Alert Routing ✅ DECIDED
**SELECTED: Route all alerts to PagerDuty**
- No severity-based routing (all alerts to same contact point)
- Simpler notification policy
- User can configure severity in PagerDuty escalation policy if needed

### Decision 3: PagerDuty Service Creation ✅ DECIDED
**SELECTED: Terraform creates everything automatically**
- Terraform creates PagerDuty service resource
- Terraform creates Grafana integration
- Integration key automatically passed to Grafana contact point
- No manual steps in PagerDuty UI

### Decision 4: Environment Variables ✅ DECIDED
```bash
# Required for PagerDuty
PAGERDUTY_TOKEN=xxx                  # API token with Read/Write permissions
PAGERDUTY_SERVICE_REGION=us          # "us" or "eu"
PAGERDUTY_USER_EMAIL=user@email.com  # Your PagerDuty account email

# Still required for Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=xxx
```

### Decision 5: Escalation Policy ✅ DECIDED
**SELECTED: Reference "Default" escalation policy only**
- Free tier has 1 escalation policy
- Reference existing "Default" policy (created automatically)
- No support for creating custom escalation policies
- Keeps implementation simple

### Decision 6: Setup Script Integration ✅ DECIDED
**SELECTED: Conditional within main Terraform apply**
- setup.sh generates terraform.tfvars with PagerDuty variables if present
- Terraform uses conditionals to create PagerDuty resources if token is set
- Single `terraform apply` handles both email and PagerDuty paths
- No separate flags needed

## Implementation Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              PAGERDUTY INTEGRATION FLOW                     │
└─────────────────────────────────────────────────────────────┘

  User runs: ./scripts/setup.sh
       │
       └─► Terraform
            │
            ├─► Check if PAGERDUTY_TOKEN is set
            │
            ├─► IF PAGERDUTY_TOKEN exists:
            │    ├─► Add PagerDuty provider
            │    ├─► Reference PagerDuty user (by email)
            │    ├─► Reference "Default" escalation policy
            │    ├─► Create PagerDuty service (Raspberry-Pi-Monitoring)
            │    ├─► Create Grafana integration (Events API v2)
            │    ├─► Create PagerDuty contact point in Grafana
            │    └─► Update notification policy → PagerDuty
            │
            └─► ELSE (no PAGERDUTY_TOKEN):
                 ├─► Create email contact point in Grafana
                 └─► Update notification policy → Email

┌─────────────────────────────────────────────────────────────┐
│              ALERT TO PAGERDUTY FLOW                        │
└─────────────────────────────────────────────────────────────┘

  Alert fires in Grafana
       │
       ├─► Notification policy routes to contact point
       │
       └─► PagerDuty contact point
            │
            ├─► Sends event to PagerDuty Events API v2
            │    (integration_key from terraform)
            │
            └─► PagerDuty Service receives event
                 │
                 ├─► Creates incident
                 │
                 └─► Escalation policy triggers
                      │
                      ├─► Immediate: Push notification to mobile app
                      ├─► Immediate: Email notification
                      └─► After 10min: Re-alert if not acknowledged
```

### Project Structure

```
iac-toolbox-raspberrypi/
├── ansible-configurations/
│   └── .env                    # Add PagerDuty variables
├── terraform/grafana-alerts/
│   ├── providers.tf           # Add PagerDuty provider (conditional)
│   ├── variables.tf           # Add PagerDuty variables
│   ├── datasources.tf         # (no changes)
│   ├── pagerduty.tf           # NEW: PagerDuty resources
│   └── alerts.tf              # Update contact point (conditional)
└── scripts/
    └── setup.sh               # Add PagerDuty vars to terraform.tfvars
```

### Configuration (.env additions)

```bash
# Existing configs
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=xxx
ALERT_EMAIL=your-email@example.com  # Still used for email fallback

# New PagerDuty configs (optional)
PAGERDUTY_TOKEN=xxx                      # API token from PagerDuty
PAGERDUTY_SERVICE_REGION=us              # "us" or "eu"
PAGERDUTY_USER_EMAIL=your-email@example.com
```

**Note**: If PAGERDUTY_TOKEN is not set, setup uses email contact point as before.

## Terraform Implementation

### providers.tf Updates

Add PagerDuty provider conditionally:

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }

    # PagerDuty provider (only used if token is set)
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = "${var.grafana_admin_user}:${var.grafana_admin_password}"
}

# PagerDuty provider (configured only if token provided)
provider "pagerduty" {
  token          = var.pagerduty_token
  service_region = var.pagerduty_service_region
}
```

**Note**: Provider is always declared, but resources only created if token is set (see conditionals below).

### variables.tf Updates

Add PagerDuty variables:

```hcl
# Existing variables...

# PagerDuty variables (optional)
variable "pagerduty_token" {
  type        = string
  description = "PagerDuty API token (optional - if not set, uses email notifications)"
  sensitive   = true
  default     = ""
}

variable "pagerduty_service_region" {
  type        = string
  description = "PagerDuty service region (us or eu)"
  default     = "us"
}

variable "pagerduty_user_email" {
  type        = string
  description = "Your PagerDuty account email"
  default     = ""
}
```

### pagerduty.tf (New File)

Create PagerDuty resources conditionally:

```hcl
# Only create PagerDuty resources if token is provided
locals {
  pagerduty_enabled = var.pagerduty_token != ""
}

# Reference existing PagerDuty user
data "pagerduty_user" "me" {
  count = local.pagerduty_enabled ? 1 : 0
  email = var.pagerduty_user_email
}

# Reference default escalation policy (free tier includes one)
data "pagerduty_escalation_policy" "default" {
  count = local.pagerduty_enabled ? 1 : 0
  name  = "Default"
}

# Create PagerDuty service for Raspberry Pi monitoring
resource "pagerduty_service" "raspberry_pi" {
  count = local.pagerduty_enabled ? 1 : 0

  name                    = "Raspberry-Pi-Monitoring"
  auto_resolve_timeout    = 14400  # 4 hours
  acknowledgement_timeout = 600    # 10 minutes

  escalation_policy = data.pagerduty_escalation_policy.default[0].id
  alert_creation    = "create_alerts_and_incidents"
}

# Create Grafana integration for the service
resource "pagerduty_service_integration" "grafana" {
  count = local.pagerduty_enabled ? 1 : 0

  name    = "Grafana"
  service = pagerduty_service.raspberry_pi[0].id
  type    = "events_api_v2_inbound_integration"
}

# Output the integration key (for debugging)
output "pagerduty_integration_key" {
  value     = local.pagerduty_enabled ? pagerduty_service_integration.grafana[0].integration_key : "not-configured"
  sensitive = true
}
```

**Key points:**
- `local.pagerduty_enabled` checks if token is set
- All resources use `count` based on this local
- Integration key automatically passed to Grafana contact point

### alerts.tf Updates

Modify contact point creation to be conditional:

```hcl
# Alert folder (no changes)
resource "grafana_folder" "alerts" {
  title = "Homelab Alerts"
}

# Email contact point (used when PagerDuty not configured)
resource "grafana_contact_point" "email" {
  count = local.pagerduty_enabled ? 0 : 1
  name  = "Email Notifications"

  email {
    addresses = [var.alert_email]
  }
}

# PagerDuty contact point (used when configured)
resource "grafana_contact_point" "pagerduty" {
  count = local.pagerduty_enabled ? 1 : 0
  name  = "PagerDuty Alerts"

  pagerduty {
    integration_key = pagerduty_service_integration.grafana[0].integration_key
    severity        = "critical"
    summary         = "{{ len .Alerts.Firing }} alert(s) firing on Raspberry Pi"
  }
}

# Notification policy (routes to appropriate contact point)
resource "grafana_notification_policy" "default" {
  group_by      = ["alertname"]
  contact_point = local.pagerduty_enabled ? grafana_contact_point.pagerduty[0].name : grafana_contact_point.email[0].name

  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"
}

# Alert rules (no changes - same 5 rules)
resource "grafana_rule_group" "homelab_alerts" {
  # ... existing rules unchanged ...
}
```

**Key changes:**
- Email contact point only created if PagerDuty not enabled
- PagerDuty contact point only created if enabled
- Notification policy uses conditional to select contact point
- Alert rules unchanged

### Setup Script Integration

Update `scripts/setup.sh` to include PagerDuty variables in terraform.tfvars:

```bash
# In the Terraform execution block, update tfvars generation:

if [ "$RUN_TERRAFORM" = true ]; then
  echo "Configuring Grafana alerts with Terraform..."
  cd terraform/grafana-alerts

  # Generate terraform.tfvars from .env
  cat > terraform.tfvars <<EOF
grafana_url            = "https://grafana.iac-toolbox.com"
grafana_admin_user     = "${GRAFANA_ADMIN_USER}"
grafana_admin_password = "${GRAFANA_ADMIN_PASSWORD}"
alert_email            = "${ALERT_EMAIL}"

# PagerDuty configuration (optional)
pagerduty_token          = "${PAGERDUTY_TOKEN:-}"
pagerduty_service_region = "${PAGERDUTY_SERVICE_REGION:-us}"
pagerduty_user_email     = "${PAGERDUTY_USER_EMAIL:-}"
EOF

  echo -e "${GREEN}✓ Generated terraform.tfvars${NC}"

  # Initialize Terraform (downloads PagerDuty provider if needed)
  echo "Initializing Terraform..."
  terraform init

  # Apply Terraform configuration
  echo "Applying Grafana alert configuration..."
  terraform apply -auto-approve

  cd ../..
  echo ""
  echo -e "${GREEN}✓ Grafana alerts configured successfully${NC}"
  echo ""
else
  echo -e "${YELLOW}Skipping Terraform execution (--ansible-only)${NC}"
  echo ""
fi
```

**Key changes:**
- Add PagerDuty variables to terraform.tfvars
- Use `${VAR:-}` syntax to provide empty default if not set
- No additional validation needed (Terraform handles conditionals)

### Success Messages

Update success output to indicate which integration is active:

```bash
if [ "$RUN_TERRAFORM" = true ]; then
  echo "Grafana Alerts:"
  echo "  - Access: https://grafana.iac-toolbox.com/alerting/list"
  echo "  - 5 alerts configured: CPU (5%), Memory (90%), Disk (80%), Offline (5m), Temp (75°C)"

  if [ -n "$PAGERDUTY_TOKEN" ]; then
    echo "  - Notifications: PagerDuty (incidents created automatically)"
    echo "  - PagerDuty Service: Raspberry-Pi-Monitoring"
  else
    echo "  - Notifications: Email ($ALERT_EMAIL)"
    echo "  - SMTP configuration required in Grafana UI for email delivery"
  fi

  echo "  - To update alerts: cd terraform/grafana-alerts && terraform apply"
  echo ""
fi
```

## Implementation Steps

### Phase 1: Update .env.example ✅
- Add `PAGERDUTY_TOKEN` variable (optional)
- Add `PAGERDUTY_SERVICE_REGION` variable with default "us"
- Add `PAGERDUTY_USER_EMAIL` variable
- Document how to get PagerDuty API token
- Document that PagerDuty is optional (falls back to email)

### Phase 2: Update Terraform Files
1. **providers.tf** - Add PagerDuty provider
2. **variables.tf** - Add PagerDuty variables with defaults
3. **pagerduty.tf** (new) - Create PagerDuty resources with conditionals
4. **alerts.tf** - Update contact points to be conditional
5. **.gitignore** - Already excludes tfvars/state

### Phase 3: Update setup.sh Script
- Add PagerDuty variables to terraform.tfvars generation
- Update success message to show which integration is active
- No validation needed (optional variables)

### Phase 4: Testing

#### Test 1: Email Fallback (No PagerDuty)
1. Ensure PAGERDUTY_TOKEN is not set in .env
2. Run `./scripts/setup.sh --terraform-only`
3. Verify email contact point created in Grafana
4. Verify notification policy routes to email

#### Test 2: PagerDuty Integration
1. Create PagerDuty account at https://pagerduty.com
2. Generate API token: Integrations → API Access Keys → Create
3. Add to .env:
   ```bash
   PAGERDUTY_TOKEN=xxx
   PAGERDUTY_SERVICE_REGION=us
   PAGERDUTY_USER_EMAIL=your-email@example.com
   ```
4. Run `./scripts/setup.sh --terraform-only`
5. Verify in Terraform output:
   - PagerDuty service created
   - Integration created
   - Integration key generated
6. Verify in Grafana:
   - PagerDuty contact point exists
   - Notification policy routes to PagerDuty
7. Verify in PagerDuty UI:
   - Service "Raspberry-Pi-Monitoring" exists
   - Grafana integration listed
   - Green checkmark (connected)

#### Test 3: Alert to PagerDuty
1. Lower CPU threshold to 5% (same as before)
2. Apply: `cd terraform/grafana-alerts && terraform apply -auto-approve`
3. Wait 10 minutes for alert to fire
4. Verify incident created in PagerDuty
5. Check mobile app receives push notification
6. Acknowledge incident in PagerDuty
7. Restore CPU threshold to 85%
8. Verify incident auto-resolves when alert clears

#### Test 4: Switch Between Email and PagerDuty
1. Start with PagerDuty configured
2. Remove PAGERDUTY_TOKEN from .env
3. Run `terraform apply` - should destroy PagerDuty resources, create email
4. Add PAGERDUTY_TOKEN back
5. Run `terraform apply` - should destroy email, create PagerDuty

### Phase 5: Documentation
- Update main README with PagerDuty setup instructions
- Add troubleshooting section for PagerDuty issues
- Document how to get PagerDuty API token
- Document free tier limitations
- Add section on mobile app setup

## Success Criteria

1. ✅ PagerDuty integration is optional (works without PAGERDUTY_TOKEN)
2. ✅ Email contact point used when PagerDuty not configured
3. ✅ PagerDuty contact point used when token provided
4. ✅ Terraform creates PagerDuty service automatically
5. ✅ Terraform creates Grafana integration automatically
6. ✅ Integration key automatically passed to Grafana
7. ✅ All 5 alerts route to PagerDuty (when enabled)
8. ✅ Incidents created in PagerDuty when alerts fire
9. ✅ Push notifications received on mobile device
10. ✅ Incidents auto-resolve when alerts clear
11. ✅ Can switch between email and PagerDuty by changing .env
12. ✅ Setup script runs without user confirmation (auto-approve)
13. ✅ Success message indicates which integration is active

## Files Created/Modified

### New Files
```
terraform/grafana-alerts/
└── pagerduty.tf           # PagerDuty service, integration, data sources
```

### Modified Files
1. **`ansible-configurations/.env.example`** - Add PagerDuty variables (optional)
2. **`terraform/grafana-alerts/providers.tf`** - Add PagerDuty provider
3. **`terraform/grafana-alerts/variables.tf`** - Add PagerDuty variables with defaults
4. **`terraform/grafana-alerts/alerts.tf`** - Make contact points conditional
5. **`scripts/setup.sh`** - Add PagerDuty vars to tfvars generation, update success message
6. **`README.md`** - Document PagerDuty setup instructions

### No Changes Required
- **`datasources.tf`** - No changes
- **Alert rules** - No changes (same 5 rules)

## Troubleshooting

### PagerDuty Provider Fails to Initialize

**Symptom**: `Error: Failed to query available provider packages`

**Fix**: Ensure PagerDuty provider version is correct:
```hcl
pagerduty = {
  source  = "PagerDuty/pagerduty"
  version = "~> 3.0"
}
```

Run `terraform init -upgrade` to download provider.

### Authentication Failed (401)

**Symptom**: `Error: authentication failed: 401 Unauthorized`

**Causes:**
1. Wrong API token
2. Token expired
3. Token doesn't have Read/Write permissions

**Fix:**
1. Go to PagerDuty: Integrations → API Access Keys
2. Create new token with Read/Write access
3. Update .env: `PAGERDUTY_TOKEN=new-token`
4. Run `./scripts/setup.sh --terraform-only`

### User Not Found

**Symptom**: `Error: user not found with email: xxx`

**Fix**: Verify email matches exactly in PagerDuty:
1. Go to PagerDuty: People & Teams → Users
2. Copy email exactly as shown
3. Update .env: `PAGERDUTY_USER_EMAIL=exact-email@example.com`

### Escalation Policy Not Found

**Symptom**: `Error: escalation policy "Default" not found`

**Fix**: Check escalation policy name in PagerDuty UI:
1. Go to PagerDuty: People & Teams → Escalation Policies
2. Note the exact name (case-sensitive)
3. Update `pagerduty.tf`:
   ```hcl
   data "pagerduty_escalation_policy" "default" {
     name = "YourExactPolicyName"
   }
   ```

### Alert Fires but No PagerDuty Incident

**Symptom**: Alert shows "Firing" in Grafana but no incident in PagerDuty

**Debug steps:**

1. **Check contact point in Grafana:**
   - Go to Alerting → Contact points
   - Find "PagerDuty Alerts"
   - Click "Test" - should receive test incident

2. **Verify integration key:**
   ```bash
   cd terraform/grafana-alerts
   terraform output pagerduty_integration_key
   ```
   Check it matches in Grafana contact point config.

3. **Test PagerDuty API directly:**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "YOUR_INTEGRATION_KEY",
       "event_action": "trigger",
       "payload": {
         "summary": "Test incident",
         "severity": "critical",
         "source": "manual-test"
       }
     }' \
     https://events.pagerduty.com/v2/enqueue
   ```
   Should return `202 Accepted` and create incident.

4. **Check Grafana logs:**
   ```bash
   ssh pi@raspberrypi.local
   docker logs grafana --tail 100 | grep -i pagerduty
   ```

### No Mobile Notifications

**Symptom**: Incident created but no push notification

**Checklist:**
1. ✅ PagerDuty mobile app installed (iOS/Android)
2. ✅ Logged into correct account
3. ✅ Notifications enabled in app settings
4. ✅ Notifications enabled in iOS/Android system settings
5. ✅ User is on-call (check On-Call → Schedules in PagerDuty)

**Fix for "Not on-call":**
- By default, single user is always on-call
- Check: People & Teams → On-Call Schedules
- Ensure your user is listed

### Incident Created but Not Auto-Resolving

**Symptom**: Alert clears in Grafana but PagerDuty incident stays open

**Cause**: Grafana might not be sending resolve events

**Fix:**
1. Check alert rule configuration:
   ```hcl
   no_data_state  = "NoData"  # Not "Alerting"
   exec_err_state = "Alerting"
   ```

2. Manually resolve old incidents in PagerDuty

3. Test with new alert - should auto-resolve when cleared

### Too Many Notifications

**Symptom**: Getting paged repeatedly for same issue

**Tune these settings:**

1. **Increase acknowledgement timeout** (PagerDuty):
   ```hcl
   acknowledgement_timeout = 1800  # 30 minutes instead of 10
   ```

2. **Increase repeat interval** (Grafana):
   ```hcl
   repeat_interval = "12h"  # Instead of 4h
   ```

3. **Adjust alert "for" duration**:
   ```hcl
   for = "10m"  # Instead of 5m - reduces false positives
   ```

### Region Mismatch Error

**Symptom**: `Error: service region mismatch`

**Fix**: Check your PagerDuty URL:
- `https://xxx.eu.pagerduty.com` → Use `service_region = "eu"`
- `https://xxx.pagerduty.com` → Use `service_region = "us"`

Update .env and re-run setup.

## Getting PagerDuty API Token

Step-by-step guide for users:

1. **Sign up for PagerDuty** (if you don't have account)
   - Go to https://www.pagerduty.com/
   - Click "Start Free Trial"
   - Choose region: US or EU
   - Complete registration

2. **Create API Token**
   - Log into PagerDuty
   - Go to **Integrations** → **API Access Keys** (or **Developer Tools** → **API Access**)
   - Click **Create New API Key**
   - Name: "Terraform" or "Homelab-Automation"
   - **Permissions**: Select "Read/Write" (required to create services)
   - Click **Create Key**
   - **COPY THE TOKEN** - you can't see it again!

3. **Add to .env**
   ```bash
   cd ansible-configurations
   nano .env

   # Add these lines:
   PAGERDUTY_TOKEN=your-token-here
   PAGERDUTY_SERVICE_REGION=us  # or "eu" based on your URL
   PAGERDUTY_USER_EMAIL=your-pagerduty-email@example.com
   ```

4. **Run setup**
   ```bash
   cd ..
   ./scripts/setup.sh --terraform-only
   ```

## Free Tier Limitations

**PagerDuty Free Tier includes:**
- ✅ Unlimited incidents
- ✅ Mobile app (iOS/Android)
- ✅ Push notifications
- ✅ Email notifications
- ✅ 1 escalation policy
- ✅ Up to 5 users
- ✅ 25 SMS per month
- ✅ Basic analytics

**Paid plans add:**
- 📞 Phone call notifications (voice alerts)
- 🔄 Multiple escalation policies
- 📊 Advanced analytics and reporting
- 💬 Slack/Microsoft Teams integration
- 📝 Postmortem templates
- 📈 SLA reporting and tracking
- 👥 Advanced team management

**For homelab use, free tier is sufficient!**

## Summary

This plan integrates PagerDuty as a replacement for email-based alert notifications, providing production-grade incident management for your Raspberry Pi homelab.

**Key Features:**
- ✅ Optional integration (falls back to email if not configured)
- ✅ Fully automated with Terraform (no manual PagerDuty UI steps)
- ✅ All 5 alerts route to PagerDuty
- ✅ Push notifications to mobile device
- ✅ Incident lifecycle tracking (trigger → acknowledge → resolve)
- ✅ Auto-resolve when alerts clear
- ✅ Integrated with existing setup script workflow

**Implementation Approach:**
- Conditional Terraform resources based on PAGERDUTY_TOKEN presence
- Single `terraform apply` handles both email and PagerDuty paths
- No changes to alert rules (same 5 alerts)
- No separate setup flags needed

**User Experience:**

**Without PagerDuty (default):**
```bash
# Just email configured
./scripts/setup.sh
# → Creates email contact point
# → Alerts appear in Grafana UI
# → Email notifications (if SMTP configured)
```

**With PagerDuty:**
```bash
# Add to .env:
# PAGERDUTY_TOKEN=xxx
# PAGERDUTY_USER_EMAIL=xxx

./scripts/setup.sh
# → Creates PagerDuty service
# → Creates Grafana integration
# → Creates PagerDuty contact point
# → All alerts route to PagerDuty
# → Push notifications on mobile
```

**Flow:**
1. User adds PagerDuty credentials to `.env` (optional)
2. Runs `./scripts/setup.sh` (same command as before)
3. Terraform detects PagerDuty token
4. Creates PagerDuty resources automatically
5. Updates Grafana to use PagerDuty contact point
6. Alerts fire → Incidents created → Push notifications sent

**Rollback:**
- Remove PAGERDUTY_TOKEN from .env
- Run `terraform apply`
- Switches back to email contact point
- PagerDuty resources destroyed

## Next Steps After Implementation

**Immediate:**
1. Create PagerDuty account and get API token
2. Add credentials to `.env`
3. Run setup script
4. Install mobile app
5. Test with CPU alert

**Tuning:**
1. Adjust alert thresholds based on false positive rate
2. Configure escalation policy in PagerDuty UI (if needed)
3. Set up maintenance windows using Grafana mute timings
4. Review incidents weekly to improve alert quality

## Prerequisites for Implementation

Before implementing this plan:
- ✅ Phase 3 completed (Grafana alerts with Terraform)
- ✅ 5 alerts working with email contact point
- ✅ Terraform 1.0+ installed
- ✅ PagerDuty account created (can be done during implementation)

## Risk Assessment

**Low Risk:**
- Changes are additive (doesn't break existing email setup)
- Conditional logic means no impact if PagerDuty not configured
- Can easily rollback by removing PAGERDUTY_TOKEN
- Terraform state handles resource lifecycle cleanly

**Potential Issues:**
- User forgets to copy API token (can't see it again after creation)
  - **Mitigation**: Document clearly, suggest password manager
- Wrong email address for user lookup
  - **Mitigation**: Validate email matches PagerDuty account exactly
- Region mismatch (US vs EU)
  - **Mitigation**: Clear documentation with URL examples

## Implementation Readiness

**Ready to proceed with implementation?**

Please review the plan and confirm:
1. ✅ Replace email entirely with PagerDuty (when configured)
2. ✅ All alerts route to PagerDuty (no severity-based routing)
3. ✅ Terraform creates PagerDuty service automatically
4. ✅ Conditional resources based on PAGERDUTY_TOKEN presence
5. ✅ Part of main terraform apply (no separate flags)
6. ✅ Reference "Default" escalation policy only

Any questions or changes needed before implementation?

