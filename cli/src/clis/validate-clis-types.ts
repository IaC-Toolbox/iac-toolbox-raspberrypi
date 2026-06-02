export enum CliName {
  Grafana = 'grafana',
  Prometheus = 'prometheus',
  Cadvisor = 'cadvisor',
  Cloudflare = 'cloudflare',
  GrafanaPagerduty = 'grafana-pagerduty',
  NodeMetricsAlerts = 'node-metrics-alerts',
  ContainerMetricsAlerts = 'container-metrics-alerts',
  MetricsAgent = 'metrics-agent',
  Platform = 'platform',
  Loki = 'loki',
  Arize = 'arize',
  GithubRunner = 'github-runner',
  Postgresql = 'postgresql',
  PgVector = 'pg-vector',
  Tailscale = 'tailscale',
}

export enum ConditionKey {
  Cloudflare = 'cloudflare',
  GrafanaPagerduty = 'grafana_pagerduty',
  NodeMetricsAlerts = 'node_metrics_alerts',
  ContainerMetricsAlerts = 'container_metrics_alerts',
}

export interface ValidationContext {
  destination: string;
  filePath: string;
  profile: string;
  config: Record<string, unknown>;
}

export interface ValidatorDescriptor {
  fn: (ctx: ValidationContext) => void;
  condition?: ConditionKey;
}
