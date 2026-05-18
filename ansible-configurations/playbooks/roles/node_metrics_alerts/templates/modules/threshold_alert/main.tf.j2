terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}


locals {
  base_labels   = { severity = var.severity }
  node_label    = var.node    != "" ? { node    = var.node    } : {}
  service_label = var.service != "" ? { service = var.service } : {}
  labels        = merge(local.base_labels, local.node_label, local.service_label)
}

resource "grafana_rule_group" "this" {
  name             = var.name
  folder_uid       = var.folder_uid
  interval_seconds = 60

  rule {
    name      = var.name
    condition = "C"

    data {
      ref_id         = "A"
      relative_time_range {
        from = 600
        to   = 0
      }
      datasource_uid = var.datasource_uid
      model          = jsonencode({ expr = var.expr, refId = "A" })
    }

    data {
      ref_id         = "B"
      datasource_uid = "__expr__"
      relative_time_range {
        from = 0
        to   = 0
      }
      model = jsonencode({ type = "reduce", refId = "B", expression = "A", reducer = "last" })
    }

    data {
      ref_id         = "C"
      datasource_uid = "__expr__"
      relative_time_range {
        from = 0
        to   = 0
      }
      model = jsonencode({
        type       = "threshold"
        refId      = "C"
        expression = "B"
        conditions = [{ evaluator = { params = [var.threshold], type = var.comparator }, type = "query" }]
      })
    }

    no_data_state  = var.no_data_state
    exec_err_state = "Alerting"
    for            = var.for
    labels         = local.labels
    annotations    = { summary = var.summary, description = var.description }
  }
}
