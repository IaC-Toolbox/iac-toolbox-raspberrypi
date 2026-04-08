# PagerDuty Integration (Optional)
# Only creates resources if PAGERDUTY_TOKEN is provided in .env

# Local to check if PagerDuty is enabled
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
  auto_resolve_timeout    = 14400  # Auto-resolve after 4 hours
  acknowledgement_timeout = 600    # Re-alert after 10 minutes if not acknowledged

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
