import { print } from '../../utils/print.js';

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

  print.blank();
  print.step('Observability stack installed');
  print.pipe();
  print.success('Node Exporter  running  (:9100)');
  print.success('Grafana Alloy  running  (:12345)');
  print.success(`Prometheus     running  (:${prometheusPort})`);
  print.success(`cAdvisor       running  (:${cadvisorPort})`);
  print.success(`Grafana        running  (:${grafanaPort})`);
  print.pipe();
  print.pipe('Services available at:');
  print.pipe(
    `  Node Exporter    http://${host}:9100     (host metrics endpoint)`
  );
  print.pipe(`  Grafana Alloy    http://${host}:12345    (pipeline graph UI)`);
  print.pipe(`  Prometheus       http://${host}:${prometheusPort}`);
  print.pipe(`  cAdvisor         http://${host}:${cadvisorPort}`);
  print.pipe(`  Grafana          http://${host}:${grafanaPort}`);
  print.pipe();

  const isRemote = config.target?.mode === 'remote';
  if (isRemote) {
    print.pipe('SSH tunnel shortcut (access from your laptop):');
    print.pipe(`  ssh -L ${grafanaPort}:localhost:${grafanaPort} \\`);
    print.pipe(`      -L ${prometheusPort}:localhost:${prometheusPort} \\`);
    print.pipe('      -L 12345:localhost:12345 \\');
    print.pipe(`      ${config.target?.user ?? 'pi'}@${host}`);
    print.pipe();
  }

  print.pipe('Login: admin / <password in ~/.iac-toolbox/credentials>');
  print.pipe();
  print.pipe('Suggested dashboards (Grafana → Dashboards → Import):');
  print.pipe('  Node Exporter Full        ID 1860');
  print.pipe('  Docker Container Metrics  ID 193');
  print.close();
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

  print.blank();
  print.step('Observability stack installed');
  print.pipe();
  print.success('Node Exporter       running  (:9100)');
  print.success('Grafana Alloy       running  (:12345)');
  print.success(`Prometheus          running  (:${prometheusPort})`);
  print.success(`cAdvisor            running  (:${cadvisorPort})`);
  print.success(`Grafana             running  (:${grafanaPort})`);
  print.success('Cloudflare Tunnel   active');
  for (const d of domains) {
    print.pipe(`    ${d.hostname}    → :${d.service_port}`);
  }
  print.pipe();
  print.pipe('Services available at:');
  print.pipe(`  Node Exporter    http://${host}:9100     (LAN only)`);
  print.pipe(`  Grafana Alloy    http://${host}:12345    (LAN only)`);
  if (prometheusDomain) {
    print.pipe(`  Prometheus       https://${prometheusDomain}`);
  } else {
    print.pipe(`  Prometheus       http://${host}:${prometheusPort}`);
  }
  print.pipe(
    `  cAdvisor         http://${host}:${cadvisorPort}     (LAN only)`
  );
  if (grafanaDomain) {
    print.pipe(`  Grafana          https://${grafanaDomain}`);
  } else {
    print.pipe(`  Grafana          http://${host}:${grafanaPort}`);
  }
  print.pipe();
  print.pipe('Login: admin / <password in ~/.iac-toolbox/credentials>');
  print.pipe();
  print.pipe('Suggested dashboards (Grafana → Dashboards → Import):');
  print.pipe('  Node Exporter Full        ID 1860');
  print.pipe('  Docker Container Metrics  ID 193');
  print.close();
}
