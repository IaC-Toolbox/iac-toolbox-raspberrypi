import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import {
  runAnsiblePlaybook,
  resolveAnsibleDir,
  resolveProjectRoot,
} from '../../utils/ansible.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import { validateClis, CliName } from '../validate-clis.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  loki?: { enabled?: boolean; port?: number; [key: string]: unknown };
}

export async function runLokiInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  let status: number;
  try {
    validateClis(CliName.Loki, {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Configuration loaded');
    print.pipe();

    print.step('Installing Grafana Loki...');
    print.divider();

    status = runAnsiblePlaybook('loki.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('Loki install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox loki install');
    print.closeError();
    process.exit(status ?? 1);
  }

  const lokiPort = config.loki?.port ?? 3100;

  print.blank();
  print.step('Grafana Loki installed successfully');
  print.pipe();
  print.success('Loki running');
  print.pipe();
  print.pipe(`Loki API    http://localhost:${lokiPort}`);
  print.pipe('Alloy UI    http://localhost:12345');
  print.pipe();
  print.pipe('Query logs in Grafana Explore: {job="docker"}');
  print.pipe();
  print.pipe('Run `iac-toolbox loki install` to reinstall');
  print.close();
}
