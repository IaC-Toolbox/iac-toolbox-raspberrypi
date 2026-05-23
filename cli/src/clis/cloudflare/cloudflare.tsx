import { Command } from 'commander';
import { render } from 'ink';
import { runCloudflareInstall } from './cloudflare-install.js';
import { runCloudflareUninstall } from './cloudflare-uninstall.js';
import CloudflareInitWizard from './cloudflare-init-wizard.js';

export function registerCloudflareCommand(program: Command): void {
  const cloudflare = program
    .command('cloudflare')
    .description('Manage Cloudflare Tunnel integration');

  cloudflare
    .command('init')
    .description('Collect Cloudflare API credentials and tunnel config')
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
          <CloudflareInitWizard
            profile={options.profile}
            destination={options.destination}
            filePath={options.filePath}
          />,
          { exitOnCtrlC: true, patchConsole: false }
        );
      }
    );

  cloudflare
    .command('install')
    .description('Install or reinstall Cloudflare Tunnel')
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
        await runCloudflareInstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );

  cloudflare
    .command('uninstall')
    .description('Remove Cloudflare Tunnel from this device')
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
        await runCloudflareUninstall(
          options.destination,
          options.profile,
          options.filePath
        );
      }
    );
}
