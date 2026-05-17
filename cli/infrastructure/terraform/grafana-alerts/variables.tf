variable "grafana_url" {
  type        = string
  description = "Grafana URL (e.g., https://grafana.example.com)"
}

variable "grafana_admin_user" {
  type    = string
  default = "admin"
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}

variable "memory_critical_threshold" {
  type    = number
  default = 95
}

variable "cpu_critical_threshold" {
  type    = number
  default = 90
}

variable "disk_critical_threshold" {
  type    = number
  default = 90
}

variable "service_name" {
  type        = string
  description = "Service name label applied to container-level alerts. Set threshold_alerts.service_name in iac-toolbox.yml."
}
