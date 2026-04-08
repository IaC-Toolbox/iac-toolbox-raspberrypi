# Alert folder
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

  lifecycle {
    create_before_destroy = true
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

  lifecycle {
    create_before_destroy = true
  }
}

# Notification policy (routes to appropriate contact point)
resource "grafana_notification_policy" "default" {
  group_by      = ["alertname"]
  contact_point = local.pagerduty_enabled ? grafana_contact_point.pagerduty[0].name : grafana_contact_point.email[0].name

  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"

  depends_on = [
    grafana_contact_point.email,
    grafana_contact_point.pagerduty
  ]
}

# Alert rule: High CPU Usage
resource "grafana_rule_group" "homelab_alerts" {
  name             = "Homelab System Alerts"
  folder_uid       = grafana_folder.alerts.uid
  interval_seconds = 300

  rule {
    name      = "High CPU Usage"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
        refId        = "A"
        intervalMs   = 1000
        maxDataPoints = 43200
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
        conditions = [
          {
            evaluator = {
              params = [80]
              type   = "gt"
            }
            type = "query"
          }
        ]
      })
    }

    no_data_state  = "NoData"
    exec_err_state = "Alerting"

    for              = "5m"
    annotations = {
      summary     = "High CPU usage detected on {{ $labels.instance }}"
      description = "CPU usage is {{ $values.B.Value | printf \"%.2f\" }}% (threshold: 80% - TESTING)"
    }
    labels = {
      severity = "warning"
    }
  }

  rule {
    name      = "High Memory Usage"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
        refId        = "A"
        intervalMs   = 1000
        maxDataPoints = 43200
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
        conditions = [
          {
            evaluator = {
              params = [90]
              type   = "gt"
            }
            type = "query"
          }
        ]
      })
    }

    no_data_state  = "NoData"
    exec_err_state = "Alerting"

    for              = "5m"
    annotations = {
      summary     = "High memory usage detected on {{ $labels.instance }}"
      description = "Memory usage is {{ $values.B.Value | printf \"%.2f\" }}% (threshold: 90%)"
    }
    labels = {
      severity = "warning"
    }
  }

  rule {
    name      = "Low Disk Space"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "(1 - (node_filesystem_avail_bytes{fstype!=\"tmpfs\",mountpoint=\"/\"} / node_filesystem_size_bytes{fstype!=\"tmpfs\",mountpoint=\"/\"})) * 100"
        refId        = "A"
        intervalMs   = 1000
        maxDataPoints = 43200
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
        conditions = [
          {
            evaluator = {
              params = [80]
              type   = "gt"
            }
            type = "query"
          }
        ]
      })
    }

    no_data_state  = "NoData"
    exec_err_state = "Alerting"

    for              = "5m"
    annotations = {
      summary     = "Low disk space detected on {{ $labels.instance }}"
      description = "Disk usage is {{ $values.B.Value | printf \"%.2f\" }}% (threshold: 80%)"
    }
    labels = {
      severity = "warning"
    }
  }

  rule {
    name      = "Device Offline"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "up{job=\"node\"}"
        refId        = "A"
        intervalMs   = 1000
        maxDataPoints = 43200
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
        conditions = [
          {
            evaluator = {
              params = [1]
              type   = "lt"
            }
            type = "query"
          }
        ]
      })
    }

    no_data_state  = "Alerting"
    exec_err_state = "Alerting"

    for              = "5m"
    annotations = {
      summary     = "Raspberry Pi is offline: {{ $labels.instance }}"
      description = "Device has been unreachable for more than 5 minutes"
    }
    labels = {
      severity = "critical"
    }
  }

  rule {
    name      = "High CPU Temperature"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "node_hwmon_temp_celsius{job=\"node\",chip=\"cpu_thermal\"}"
        refId        = "A"
        intervalMs   = 1000
        maxDataPoints = 43200
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
        conditions = [
          {
            evaluator = {
              params = [75]
              type   = "gt"
            }
            type = "query"
          }
        ]
      })
    }

    no_data_state  = "NoData"
    exec_err_state = "Alerting"

    for              = "5m"
    annotations = {
      summary     = "High CPU temperature on {{ $labels.instance }}"
      description = "CPU temperature is {{ $values.B.Value | printf \"%.1f\" }}°C (threshold: 75°C)"
    }
    labels = {
      severity = "critical"
    }
  }
}
