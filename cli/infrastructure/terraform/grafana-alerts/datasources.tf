# Reference the existing Prometheus data source created by Ansible
data "grafana_data_source" "prometheus" {
  name = "Prometheus"
}
