import TargetInitWizard from './target/target-init-wizard.js';
import MetricsAgentInitWizard from './metrics-agent/metrics-agent-init-wizard.js';
import GrafanaInitWizard from './grafana/grafana-init-wizard.js';
import PrometheusInitWizard from './prometheus/prometheus-init-wizard.js';
import GrafanaPagerdutyInitWizard from './grafana-pagerduty/grafana-pagerduty-init-wizard.js';
import CloudflareInitWizard from './cloudflare/cloudflare-init-wizard.js';
import NodeMetricsAlertsInitWizard from './node-metrics-alerts/node-metrics-alerts-init-wizard.js';
import ContainerMetricsAlertsInitWizard from './container-metrics-alerts/container-metrics-alerts-init-wizard.js';
import type { WizardDescriptor, WizardContext } from './run-wizard.js';

export const CLI_WIZARD_MAP: Record<string, WizardDescriptor[]> = {
  // ── Leaf CLIs ────────────────────────────────────────────────────────────────

  target: [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <TargetInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  'metrics-agent-wizard': [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <MetricsAgentInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  grafana: [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <GrafanaInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          profile={ctx.profile}
          onComplete={onComplete}
        />
      ),
    },
  ],

  prometheus: [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <PrometheusInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  'grafana-pagerduty': [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <GrafanaPagerdutyInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  cloudflare: [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <CloudflareInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          profile={ctx.profile}
          onComplete={onComplete}
        />
      ),
    },
  ],

  'node-metrics-alerts': [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <NodeMetricsAlertsInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  'container-metrics-alerts': [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <ContainerMetricsAlertsInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],

  // ── Super CLIs ───────────────────────────────────────────────────────────────

  // metrics-agent init: configure target (host/SSH) then alloy remote write URL
  'metrics-agent': [
    {
      fn: (ctx: WizardContext, onComplete) => (
        <TargetInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
    {
      fn: (ctx: WizardContext, onComplete) => (
        <MetricsAgentInitWizard
          destination={ctx.destination}
          filePath={ctx.filePath}
          onComplete={onComplete}
        />
      ),
    },
  ],
};
