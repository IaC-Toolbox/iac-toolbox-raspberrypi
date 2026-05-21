variable "grafana_url" {
  type        = string
  description = "Grafana API endpoint (e.g., https://grafana.example.com)"
}

variable "grafana_admin_user" {
  type    = string
  default = "admin"
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}

variable "pagerduty_token" {
  type      = string
  sensitive = true
}

variable "pagerduty_service_region" {
  type    = string
  default = "eu"
}

variable "pagerduty_service_name" {
  type        = string
  description = "Name of the PagerDuty service to create. Avoid spaces — spaces cause routing issues."
  default     = "iac-toolbox"
}
