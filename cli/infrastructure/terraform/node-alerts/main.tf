# ── Host alerts (Node Exporter) ─────────────────────────────────────────────

module "alert_node_down" {
  source         = "../modules/threshold_alert"
  name           = "NodeDown"
  folder_uid     = grafana_folder.node_alerts.uid
  datasource_uid = data.grafana_data_source.prometheus.uid
  expr           = "up{job=\"node_exporter\",instance=\"${local.node_name}\"}"
  threshold      = 1
  comparator     = "lt"
  for            = "2m"
  severity       = "critical"
  no_data_state  = "Alerting"
  node           = local.node_name
  summary        = "Host ${local.node_name} is offline"
  description    = "No scrape data for more than 2 minutes."
}

module "alert_low_disk" {
  source         = "../modules/threshold_alert"
  name           = "LowDiskSpace"
  folder_uid     = grafana_folder.node_alerts.uid
  datasource_uid = data.grafana_data_source.prometheus.uid
  expr           = "(1 - (node_filesystem_avail_bytes{instance=\"${local.node_name}\",fstype!~\"tmpfs|overlay\",mountpoint=\"/\"} / node_filesystem_size_bytes{instance=\"${local.node_name}\",fstype!~\"tmpfs|overlay\",mountpoint=\"/\"})) * 100"
  threshold      = var.disk_critical_threshold
  for            = "5m"
  severity       = "critical"
  node           = local.node_name
  summary        = "Low disk space on ${local.node_name}"
  description    = "Root filesystem above ${var.disk_critical_threshold}%."
}

module "alert_high_memory" {
  source         = "../modules/threshold_alert"
  name           = "HighMemoryUsage"
  folder_uid     = grafana_folder.node_alerts.uid
  datasource_uid = data.grafana_data_source.prometheus.uid
  expr           = "(1 - (node_memory_MemAvailable_bytes{instance=\"${local.node_name}\"} / node_memory_MemTotal_bytes{instance=\"${local.node_name}\"})) * 100"
  threshold      = var.memory_critical_threshold
  for            = "5m"
  severity       = "critical"
  node           = local.node_name
  summary        = "High memory on ${local.node_name}"
  description    = "Memory above ${var.memory_critical_threshold}%."
}

module "alert_swap_in_use" {
  source         = "../modules/threshold_alert"
  name           = "SwapInUse"
  folder_uid     = grafana_folder.node_alerts.uid
  datasource_uid = data.grafana_data_source.prometheus.uid
  expr           = "node_memory_SwapUsed_bytes{instance=\"${local.node_name}\"}"
  threshold      = 0
  for            = "5m"
  severity       = "warning"
  node           = local.node_name
  summary        = "Swap in use on ${local.node_name}"
  description    = "Physical memory may be exhausted."
}
