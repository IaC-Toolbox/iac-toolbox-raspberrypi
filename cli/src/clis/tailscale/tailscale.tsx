import { Command } from 'commander';
import { render } from 'ink';
import { runTailscaleInstall } from './tailscale-install.js';
import TailscaleInitWizard from './tailscale-init-wizard.js';

export function registerTailscaleCommand(program: Command): void {
  const tailscale = program
    .command('tailscale')
    .description('Tailscale VPN — private network for your devices');

  tailscale
    .command('init')
    .description('Configure Tailscale auth key and hostname')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(
      (options: {
        profile: string;
        destination: string;
        filePath?: string;
      }) => {
        render(
          <TailscaleInitWizard
            destination={options.destination}
            profile={options.profile}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  tailscale
    .command('install')
    .description('Install Tailscale on the target device')
    .option('--profile <name>', 'Credential profile to use', 'default')
    .option(
      '--destination <path>',
      'Path to infrastructure directory',
      'infrastructure'
    )
    .option('--filePath <path>', 'Path to a per-device config file')
    .action(
      async (options: {
        profile: string;
        destination: string;
        filePath?: string;
      }) => {
        await runTailscaleInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
