import { createElement } from 'react';
import { Command } from 'commander';

/**
 * Build the `agent` command group for the iac-toolbox CLI.
 *
 * Registers the `init` and `apply` subcommands and wires their actions
 * via dynamic imports so heavy modules are only loaded when invoked.
 */
export function buildAgentCommand(): Command {
  const agent = new Command('agent').description(
    'Deploy observability agent (Node Exporter + Grafana Alloy + cAdvisor)'
  );

  agent
    .command('init')
    .description(
      'Configure remote Grafana and Prometheus endpoints for the agent'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(async (options: { destination: string; filePath?: string }) => {
      const { render } = await import('ink');
      const { default: AgentInitWizard } = await import(
        '../components/agent-init-wizard.js'
      );
      render(
        createElement(AgentInitWizard, { destination: options.destination }),
        {
          exitOnCtrlC: true,
          patchConsole: false,
        }
      );
    });

  agent
    .command('apply')
    .description('Install the observability agent stack')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(async (options: { destination: string; filePath?: string }) => {
      const { runAgentInstall } = await import('../actions/agent-install.js');
      await runAgentInstall(options.destination, options.filePath);
    });

  return agent;
}
