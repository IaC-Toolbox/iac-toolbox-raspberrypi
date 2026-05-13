#!/usr/bin/env node
import { Command } from 'commander';
import { buildApplyCommand } from './commands/applyCommand.js';
import { registerInitCommand } from './entry-points/init.js';
import { registerCredentialsCommand } from './entry-points/credentials.js';
import { registerCloudflareCommand } from './entry-points/cloudflare.js';
import { registerVaultCommand } from './entry-points/vault.js';
import { registerGrafanaCommand } from './entry-points/grafana.js';
import { registerLokiCommand } from './entry-points/loki.js';
import { registerPrometheusCommand } from './entry-points/prometheus.js';
import { registerMetricsAgentCommand } from './entry-points/metrics-agent.js';
import { registerGithubBuildWorkflowCommand } from './entry-points/github-build-workflow.js';
import { registerGithubRunnerCommand } from './entry-points/github-runner.js';
import { registerTargetCommand } from './entry-points/target.js';
import { registerInstallCommand } from './entry-points/install.js';
import { registerUninstallCommand } from './entry-points/uninstall.js';


const program = new Command();

program
  .name('iac-toolbox')
  .description('Infrastructure automation CLI for homelabs')
  .version('1.0.0', '-v, --version', 'Output the current version')
  .option('-C <path>', 'Run as if started in <path>')
  .option('-c <name>=<value>', 'Set config variable')
  .option('--profile <name>', 'Credential profile to use', 'default');

const platform = program
  .command('platform')
  .description('Manage the full observability platform');

platform
  .command('init')
  .description('Start the observability setup wizard')
  .option('--profile <name>', 'Credential profile to use', 'default')
  .option('--output <path>', 'Path to write config file', './iac-toolbox.yml')
  .action(async (options: { profile: string; output: string }) => {
    const { default: InitWizard } = await import('./components/InitWizard.js');
    render(<InitWizard profile={options.profile} output={options.output} />, {
      exitOnCtrlC: true,
      patchConsole: false,
    });
  });


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

const { buildApplyCommand } = await import('./commands/applyCommand.js');
program.addCommand(buildApplyCommand());

if (process.argv.length === 2) {
  program.help();
}

program.parse();
