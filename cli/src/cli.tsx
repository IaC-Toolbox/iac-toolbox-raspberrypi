#!/usr/bin/env node
import { Command } from 'commander';
import { registerCloudflareCommand } from './clis/cloudflare/cloudflare.js';
import { registerGrafanaCommand } from './clis/grafana/grafana.js';
import { registerPrometheusCommand } from './clis/prometheus/prometheus.js';
import { registerMetricsAgentCommand } from './clis/metrics-agent/metrics-agent.js';
import { registerNodeMetricsAlertsCommand } from './clis/node-metrics-alerts/node-metrics-alerts.js';
import { registerContainerMetricsAlertsCommand } from './clis/container-metrics-alerts/container-metrics-alerts.js';
import { registerGrafanaPagerdutyCommand } from './clis/grafana-pagerduty/grafana-pagerduty.js';
import { registerTargetCommand } from './clis/target/target.js';
import { registerPlatformCommand } from './clis/platform/platform.js';
import { registerCAdvisorCommand } from './clis/cadvisor/cadvisor.js';
import { registerLokiCommand } from './clis/loki/loki.js';

const program = new Command();

program
  .name('iac-toolbox')
  .description('Infrastructure automation CLI for homelabs')
  .version('1.0.0', '-v, --version', 'Output the current version')
  .option('-C <path>', 'Run as if started in <path>')
  .option('-c <name>=<value>', 'Set config variable')
  .option('--profile <name>', 'Credential profile to use', 'default');

// main commands - 2 profiles
registerPlatformCommand(program);
registerMetricsAgentCommand(program);

// Helpers
registerCloudflareCommand(program);
registerGrafanaCommand(program);
registerPrometheusCommand(program);
registerCAdvisorCommand(program);
registerLokiCommand(program);
registerNodeMetricsAlertsCommand(program);
registerContainerMetricsAlertsCommand(program);
registerGrafanaPagerdutyCommand(program);

// SSH Setter
registerTargetCommand(program);

if (process.argv.length === 2) {
  program.help();
}

program.parse();
