import { validateGrafana } from './grafana/grafana.validation.js';
import { validatePrometheus } from './prometheus/prometheus.validation.js';
import {
  validateMetricsAgent,
  type MetricsAgentValidationConfig,
} from './metrics-agent/metrics-agent.validation.js';
import {
  validateCadvisor,
  type CadvisorValidationConfig,
} from './cadvisor/cadvisor.validation.js';
import {
  validateCloudflare,
  type CloudflareValidationConfig,
} from './cloudflare/cloudflare.validation.js';
import { validateGrafanaPagerduty } from './grafana-pagerduty/grafana-pagerduty.validation.js';
import { validateNodeMetricsAlerts } from './node-metrics-alerts/node-metrics-alerts.validation.js';
import { validateContainerMetricsAlerts } from './container-metrics-alerts/container-metrics-alerts.validation.js';
import { validateThresholdAlerts } from './threshold-alerts/threshold-alerts.validation.js';
import type {
  ValidatorDescriptor,
  ValidationContext,
} from './validate-clis.js';

export const CLI_VALIDATION_MAP: Record<string, ValidatorDescriptor[]> = {
  // ── Leaf CLIs ─────────────────────────────────────────────────────────────
  // Each has exactly one validator: its own.

  grafana: [
    {
      fn: (ctx: ValidationContext) =>
        validateGrafana(ctx.destination, ctx.filePath, ctx.profile),
    },
  ],

  prometheus: [
    {
      fn: (ctx: ValidationContext) =>
        validatePrometheus(ctx.destination, ctx.filePath, ctx.profile),
    },
  ],

  cadvisor: [
    {
      fn: (ctx: ValidationContext) =>
        validateCadvisor(
          ctx.destination,
          ctx.filePath,
          ctx.config as CadvisorValidationConfig
        ),
    },
  ],

  cloudflare: [
    {
      fn: (ctx: ValidationContext) =>
        validateCloudflare(
          ctx.destination,
          ctx.filePath,
          ctx.profile,
          ctx.config as CloudflareValidationConfig
        ),
    },
  ],

  'grafana-pagerduty': [
    {
      fn: (ctx: ValidationContext) =>
        validateGrafanaPagerduty(ctx.destination, ctx.filePath),
    },
  ],

  'node-metrics-alerts': [
    {
      fn: (ctx: ValidationContext) =>
        validateNodeMetricsAlerts(ctx.destination, ctx.filePath),
    },
  ],

  'container-metrics-alerts': [
    {
      fn: (ctx: ValidationContext) =>
        validateContainerMetricsAlerts(ctx.destination, ctx.filePath),
    },
  ],

  'threshold-alerts': [
    {
      fn: (ctx: ValidationContext) =>
        validateThresholdAlerts(ctx.destination, ctx.filePath),
    },
  ],

  // ── Super CLIs ────────────────────────────────────────────────────────────
  // Each validates its own config AND every sub-system it orchestrates.

  // metrics-agent deploys: Grafana Alloy + Node Exporter + cAdvisor
  'metrics-agent': [
    {
      fn: (ctx: ValidationContext) =>
        validateMetricsAgent(
          ctx.destination,
          ctx.filePath,
          ctx.config as MetricsAgentValidationConfig
        ),
    },
    {
      fn: (ctx: ValidationContext) =>
        validateCadvisor(
          ctx.destination,
          ctx.filePath,
          ctx.config as CadvisorValidationConfig
        ),
    },
    // node-exporter: add validateNodeExporter entry here once its validator exists
  ],

  // platform deploys: all sub-systems in observability_platform.yml
  platform: [
    {
      fn: (ctx: ValidationContext) =>
        validateGrafana(ctx.destination, ctx.filePath, ctx.profile),
    },
    {
      fn: (ctx: ValidationContext) =>
        validatePrometheus(ctx.destination, ctx.filePath, ctx.profile),
    },
    {
      fn: (ctx: ValidationContext) =>
        validateMetricsAgent(
          ctx.destination,
          ctx.filePath,
          ctx.config as MetricsAgentValidationConfig
        ),
    },
    {
      fn: (ctx: ValidationContext) =>
        validateCadvisor(
          ctx.destination,
          ctx.filePath,
          ctx.config as CadvisorValidationConfig
        ),
    },
    {
      fn: (ctx: ValidationContext) =>
        validateCloudflare(
          ctx.destination,
          ctx.filePath,
          ctx.profile,
          ctx.config as CloudflareValidationConfig
        ),
      condition: 'cloudflare',
    },
    {
      fn: (ctx: ValidationContext) =>
        validateGrafanaPagerduty(ctx.destination, ctx.filePath),
      condition: 'grafana_pagerduty',
    },
    {
      fn: (ctx: ValidationContext) =>
        validateNodeMetricsAlerts(ctx.destination, ctx.filePath),
      condition: 'node_metrics_alerts',
    },
    {
      fn: (ctx: ValidationContext) =>
        validateContainerMetricsAlerts(ctx.destination, ctx.filePath),
      condition: 'container_metrics_alerts',
    },
    {
      fn: (ctx: ValidationContext) =>
        validateThresholdAlerts(ctx.destination, ctx.filePath),
      condition: 'threshold_alerts',
    },
  ],
};
