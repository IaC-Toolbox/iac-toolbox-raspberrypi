import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { render } from 'ink';
import { runCloudflareInstall } from './cloudflare-install.js';
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
    .action((options: { profile: string; destination: string }) => {
      render(
        <CloudflareInitWizard
          profile={options.profile}
          destination={options.destination}
        />,
        { exitOnCtrlC: true, patchConsole: false }
      );
    });

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
    .action(() => {
      const result = spawnSync(
        'bash',
        ['infrastructure/scripts/uninstall-cloudflared.sh', '--local'],
        { stdio: 'inherit' }
      );
      process.exit(result.status ?? 1);
    });
}
