terraform {
  required_version = ">= 1.0"
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = "${var.grafana_admin_user}:${var.grafana_admin_password}"
}

data "grafana_data_source" "prometheus" {
  name = "Prometheus"
}

# Infer the node name from the machine running terraform apply.
# Falls back to NODE_NAME env var — useful in CI where apply runs on a different
# machine than the monitored host.
data "external" "node_name" {
  program = ["bash", "-c", "echo \"{\\\"name\\\": \\\"$${NODE_NAME:-$(hostname)}\\\"}\""]
}

locals {
  node_name = data.external.node_name.result.name
}

# One folder per service — named after the service
resource "grafana_folder" "container_alerts" {
  title = "${var.service_name}"
}
