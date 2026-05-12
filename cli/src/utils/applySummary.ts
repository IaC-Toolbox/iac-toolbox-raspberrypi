export interface CloudflareConfig {
  enabled?: boolean;
  domains?: Array<{
    hostname: string;
    service_port: number;
    service: string;
  }>;
  [key: string]: unknown;
}

export interface ApplySummaryConfig {
  [key: string]: unknown;
  target?: {
    mode?: string;
    user?: string;
    [key: string]: unknown;
  };
  grafana?: {
    port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  prometheus?: {
    port?: number;
    domain?: string;
    [key: string]: unknown;
  };
  cadvisor?: {
    enabled?: boolean;
    port?: number;
    [key: string]: unknown;
  };
  cloudflare?: CloudflareConfig;
}

/**
 * Print post-install summary when Cloudflare is disabled.
 */
export function printSummaryNoCloudflare(
  config: ApplySummaryConfig,
  host: string
): void {
  const grafanaPort = config.grafana?.port ?? 3000;
  const prometheusPort = config.prometheus?.port ?? 9090;
  const cadvisorPort = (config.cadvisor?.port as number | undefined) ?? 8080;

  console.log('');
  console.log('◆  Observability stack installed');
  console.log('│');
  console.log('│  ✔ Node Exporter  running  (:9100)');
  console.log('│  ✔ Grafana Alloy  running  (:12345)');
  console.log(`│  ✔ Prometheus     running  (:${prometheusPort})`);
  console.log(`│  ✔ cAdvisor       running  (:${cadvisorPort})`);
  console.log(`│  ✔ Grafana        running  (:${grafanaPort})`);
  console.log('│');
  console.log('│  Services available at:');
  console.log(
    `│    Node Exporter    http://${host}:9100     (host metrics endpoint)`
  );
  console.log(
    `│    Grafana Alloy    http://${host}:12345    (pipeline graph UI)`
  );
  console.log(`│    Prometheus       http://${host}:${prometheusPort}`);
  console.log(`│    cAdvisor         http://${host}:${cadvisorPort}`);
  console.log(`│    Grafana          http://${host}:${grafanaPort}`);
  console.log('│');

  const isRemote = config.target?.mode === 'remote';
  if (isRemote) {
    console.log('│  SSH tunnel shortcut (access from your laptop):');
    console.log(`│    ssh -L ${grafanaPort}:localhost:${grafanaPort} \\`);
    console.log(`│        -L ${prometheusPort}:localhost:${prometheusPort} \\`);
    console.log('│        -L 12345:localhost:12345 \\');
    console.log(`│        ${config.target?.user ?? 'pi'}@${host}`);
    console.log('│');
  }

  console.log('│  Login: admin / <password in ~/.iac-toolbox/credentials>');
  console.log('│');
  console.log('│  Suggested dashboards (Grafana → Dashboards → Import):');
  console.log('│    Node Exporter Full        ID 1860');
  console.log('│    Docker Container Metrics  ID 193');
  console.log('└');
}

/**
 * Print post-install summary when Cloudflare is enabled.
 */
export function printSummaryWithCloudflare(
  config: ApplySummaryConfig,
  host: string
): void {
  const grafanaPort = config.grafana?.port ?? 3000;
  const prometheusPort = config.prometheus?.port ?? 9090;
  const cadvisorPort = (config.cadvisor?.port as number | undefined) ?? 8080;
  const grafanaDomain = config.grafana?.domain as string | undefined;
  const prometheusDomain = config.prometheus?.domain as string | undefined;
  const domains = config.cloudflare?.domains ?? [];

  console.log('');
  console.log('◆  Observability stack installed');
  console.log('│');
  console.log('│  ✔ Node Exporter       running  (:9100)');
  console.log('│  ✔ Grafana Alloy       running  (:12345)');
  console.log(`│  ✔ Prometheus          running  (:${prometheusPort})`);
  console.log(`│  ✔ cAdvisor            running  (:${cadvisorPort})`);
  console.log(`│  ✔ Grafana             running  (:${grafanaPort})`);
  console.log('│  ✔ Cloudflare Tunnel   active');
  for (const d of domains) {
    console.log(`│       ${d.hostname}    → :${d.service_port}`);
  }
  console.log('│');
  console.log('│  Services available at:');
  console.log(`│    Node Exporter    http://${host}:9100     (LAN only)`);
  console.log(`│    Grafana Alloy    http://${host}:12345    (LAN only)`);
  if (prometheusDomain) {
    console.log(`│    Prometheus       https://${prometheusDomain}`);
  } else {
    console.log(`│    Prometheus       http://${host}:${prometheusPort}`);
  }
  console.log(
    `│    cAdvisor         http://${host}:${cadvisorPort}     (LAN only)`
  );
  if (grafanaDomain) {
    console.log(`│    Grafana          https://${grafanaDomain}`);
  } else {
    console.log(`│    Grafana          http://${host}:${grafanaPort}`);
  }
  console.log('│');
  console.log('│  Login: admin / <password in ~/.iac-toolbox/credentials>');
  console.log('│');
  console.log('│  Suggested dashboards (Grafana → Dashboards → Import):');
  console.log('│    Node Exporter Full        ID 1860');
  console.log('│    Docker Container Metrics  ID 193');
  console.log('└');
}
