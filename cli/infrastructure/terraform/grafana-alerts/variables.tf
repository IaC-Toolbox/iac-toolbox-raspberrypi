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
