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
import {
  validateLoki,
  type LokiValidationConfig,
} from './loki/loki.validation.js';
import {
  validateArize,
  type ArizeValidationConfig,
} from './arize/arize.validation.js';
import {
  validateGithubRunner,
  type GithubRunnerValidationConfig,
} from './github-runner/github-runner.validation.js';
import {
  CliName,
  ConditionKey,
  type ValidatorDescriptor,
  type ValidationContext,
} from './validate-clis-types.js';

export const CLI_VALIDATION_MAP: Record<CliName, ValidatorDescriptor[]> = {
  // ── Leaf CLIs ─────────────────────────────────────────────────────────────
  // Each has exactly one validator: its own.

  [CliName.Grafana]: [
    {
      fn: (ctx: ValidationContext) =>
        validateGrafana(ctx.destination, ctx.filePath, ctx.profile),
    },
  ],

  [CliName.Prometheus]: [
    {
      fn: (ctx: ValidationContext) =>
        validatePrometheus(ctx.destination, ctx.filePath, ctx.profile),
    },
  ],

  [CliName.Cadvisor]: [
    {
      fn: (ctx: ValidationContext) =>
        validateCadvisor(
          ctx.destination,
          ctx.filePath,
          ctx.config as CadvisorValidationConfig
        ),
    },
  ],

  [CliName.Loki]: [
    {
      fn: (ctx: ValidationContext) =>
        validateLoki(
          ctx.destination,
          ctx.filePath,
          ctx.config as LokiValidationConfig
        ),
    },
  ],

  [CliName.Arize]: [
    {
      fn: (ctx: ValidationContext) =>
        validateArize(
          ctx.destination,
          ctx.filePath,
          ctx.config as ArizeValidationConfig
        ),
    },
  ],

  [CliName.GithubRunner]: [
    {
      fn: (ctx: ValidationContext) =>
        validateGithubRunner(
          ctx.destination,
          ctx.filePath,
          ctx.config as GithubRunnerValidationConfig,
          ctx.profile
        ),
    },
  ],

  [CliName.Cloudflare]: [
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

  [CliName.GrafanaPagerduty]: [
    {
      fn: (ctx: ValidationContext) =>
        validateGrafanaPagerduty(ctx.destination, ctx.filePath),
    },
  ],

  [CliName.NodeMetricsAlerts]: [
    {
      fn: (ctx: ValidationContext) =>
        validateNodeMetricsAlerts(ctx.destination, ctx.filePath),
    },
  ],

  [CliName.ContainerMetricsAlerts]: [
    {
      fn: (ctx: ValidationContext) =>
        validateContainerMetricsAlerts(ctx.destination, ctx.filePath),
    },
  ],

  // ── Super CLIs ────────────────────────────────────────────────────────────
  // Each validates its own config AND every sub-system it orchestrates.

  // metrics-agent deploys: Grafana Alloy + Node Exporter + cAdvisor
  [CliName.MetricsAgent]: [
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
  [CliName.Platform]: [
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
        validateLoki(
          ctx.destination,
          ctx.filePath,
          ctx.config as LokiValidationConfig
        ),
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
      condition: ConditionKey.Cloudflare,
    },
    {
      fn: (ctx: ValidationContext) =>
        validateGrafanaPagerduty(ctx.destination, ctx.filePath),
      condition: ConditionKey.GrafanaPagerduty,
    },
    {
      fn: (ctx: ValidationContext) =>
        validateNodeMetricsAlerts(ctx.destination, ctx.filePath),
      condition: ConditionKey.NodeMetricsAlerts,
    },
    {
      fn: (ctx: ValidationContext) =>
        validateContainerMetricsAlerts(ctx.destination, ctx.filePath),
      condition: ConditionKey.ContainerMetricsAlerts,
    },
  ],
};
