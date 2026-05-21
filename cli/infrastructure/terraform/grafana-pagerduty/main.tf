# ── PagerDuty ─────────────────────────────────────────────────────────────

# Reference the default escalation policy.
# The free PagerDuty plan includes one escalation policy — reference it rather
# than creating a new one.
data "pagerduty_escalation_policy" "default" {
  name = "Default"
}

# The PagerDuty service — all incidents land here and are routed via the
# escalation policy. Avoid spaces in the name; spaces cause routing issues
# where alert messages fail to match the service.
#
# The resource label is slugified from grafana_pagerduty.service_name at
# Jinja2 render time: lower | replace('-','_') | replace(' ','_').
# For service_name "Infrastructure-Monitoring" → label "infrastructure_monitoring".
resource "pagerduty_service" "iac_toolbox" {
  name                    = var.pagerduty_service_name
  escalation_policy       = data.pagerduty_escalation_policy.default.id
  alert_creation          = "create_alerts_and_incidents"
  auto_resolve_timeout    = 172800  # auto-resolve after 48 hours
  acknowledgement_timeout = 86400   # re-alert after 24 hours if acknowledged but not resolved
}

# The service integration module — binds Grafana to the service via Events API v2
# and produces the integration key consumed by the Grafana contact point below.
# The resource label reference uses the same slug filter as the resource above.
module "pagerduty" {
  source  = "./modules/pagerduty"
  service = pagerduty_service.iac_toolbox.id
}

# ── Grafana ───────────────────────────────────────────────────────────────

# Contact point — pushes firing alerts to PagerDuty using the integration key
# produced by the module above.
resource "grafana_contact_point" "pagerduty" {
  name = "PagerDuty On-Call"

  pagerduty {
    integration_key = module.pagerduty.integration_key
    severity        = "critical"
    # Go template rendered at alert-fire time — builds the PagerDuty incident title
    # from the node label and per-alert summary annotations (set on each rule).
    # Uses .Annotations.summary instead of .Labels.alertname because alertname is
    # unreliable when alerts fire in DatasourceNoData state.
    # Raw blocks prevent Jinja2 from interpreting Go template delimiters as expressions.
    summary = "{{ len .Alerts.Firing }} alert(s) on {{ (index .Alerts.Firing 0).Labels.node }}{{ if (index .Alerts.Firing 0).Labels.service }} [{{ (index .Alerts.Firing 0).Labels.service }}]{{ end }}: {{ range .Alerts.Firing }}{{ .Annotations.summary }}; {{ end }}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Notification policy — routes every alert through PagerDuty with per-severity timing.
# group_by uses custom labels: node isolates per host, service isolates per container
# (absent on host alerts so host alerts collapse to one incident per node).
resource "grafana_notification_policy" "main" {
  group_by      = ["node", "service"]
  contact_point = grafana_contact_point.pagerduty.name

  # Default: 30s buffer to group related alerts that fire together (e.g., NodeDown +
  # LowDisk on the same event). Repeat daily — sufficient for a pet-project cadence.
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "24h"

  # Critical — 0s wait so a node going offline pages immediately.
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "critical"
    }
    contact_point   = grafana_contact_point.pagerduty.name
    group_wait      = "0s"
    repeat_interval = "24h"
  }

  # Warning — 1m buffer reduces flapping noise from transient spikes.
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "warning"
    }
    contact_point   = grafana_contact_point.pagerduty.name
    group_wait      = "1m"
    repeat_interval = "24h"
  }

  depends_on = [grafana_contact_point.pagerduty]
}
