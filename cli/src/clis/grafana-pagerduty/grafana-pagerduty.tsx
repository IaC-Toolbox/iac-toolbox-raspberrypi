import { Command } from 'commander';
import { render } from 'ink';
import { runGrafanaPagerdutyInstall } from './grafana-pagerduty-install.js';
import GrafanaPagerdutyInitWizard from './grafana-pagerduty-init-wizard.js';

export function registerGrafanaPagerdutyCommand(program: Command): void {
  const grafanaPagerduty = program
    .command('grafana-pagerduty')
    .description(
      'Manage Grafana → PagerDuty alerting integration (Terraform templates via Ansible)'
    );

  grafanaPagerduty
    .command('init')
    .description(
      'Configure PagerDuty token, region, and service name for Grafana alerting integration'
    )
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .action(
      (options: {
        destination: string;
        filePath?: string;
        profile: string;
      }) => {
        render(
          <GrafanaPagerdutyInitWizard
            destination={options.destination}
            profile={options.profile}
            filePath={options.filePath}
          />,
          {
            exitOnCtrlC: true,
            patchConsole: false,
          }
        );
      }
    );

  grafanaPagerduty
    .command('install')
    .description('Render Grafana-PagerDuty Terraform templates via Ansible')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .action(
      async (options: {
        destination: string;
        filePath?: string;
        profile: string;
      }) => {
        await runGrafanaPagerdutyInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
