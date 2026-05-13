#!/usr/bin/env node
import { Command } from 'commander';
import { buildApplyCommand } from './clis/apply/apply-command.js';
import { registerInitCommand } from './clis/init/init.js';
import { registerCredentialsCommand } from './clis/credentials/credentials.js';
import { registerCloudflareCommand } from './clis/cloudflare/cloudflare.js';
import { registerVaultCommand } from './clis/vault/vault.js';
import { registerGrafanaCommand } from './clis/grafana/grafana.js';
import { registerLokiCommand } from './clis/loki/loki.js';
import { registerPrometheusCommand } from './clis/prometheus/prometheus.js';
import { registerMetricsAgentCommand } from './clis/metrics-agent/metrics-agent.js';
import { registerGithubBuildWorkflowCommand } from './clis/github-build-workflow/github-build-workflow.js';
import { registerGithubRunnerCommand } from './clis/github-runner/github-runner.js';
import { registerTargetCommand } from './clis/target/target.js';
import { registerInstallCommand } from './clis/install/install.js';
import { registerUninstallCommand } from './clis/uninstall/uninstall.js';
import { registerPlatformCommand } from './clis/platform/platform.js';

const program = new Command();

program
  .name('iac-toolbox')
  .description('Infrastructure automation CLI for homelabs')
  .version('1.0.0', '-v, --version', 'Output the current version')
  .option('-C <path>', 'Run as if started in <path>')
  .option('-c <name>=<value>', 'Set config variable')
  .option('--profile <name>', 'Credential profile to use', 'default');

registerPlatformCommand(program);
registerInitCommand(program);
registerCredentialsCommand(program);
registerCloudflareCommand(program);
registerVaultCommand(program);
registerGrafanaCommand(program);
registerLokiCommand(program);
registerPrometheusCommand(program);
registerMetricsAgentCommand(program);
registerGithubBuildWorkflowCommand(program);
registerGithubRunnerCommand(program);
registerTargetCommand(program);
registerInstallCommand(program);
registerUninstallCommand(program);

program.addCommand(buildApplyCommand());

if (process.argv.length === 2) {
  program.help();
}

program.parse();
