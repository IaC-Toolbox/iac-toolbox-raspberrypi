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
import { loadCredentials } from '../../loaders/credentials-loader.js';

interface IacToolboxConfig {
  [key: string]: unknown;
  postgresql?: {
    enabled?: boolean;
    port?: number;
    database?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export async function runPostgresqlInstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  const credentials = loadCredentials(profile);
  const postgresPassword = credentials['postgres_password'];

  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as IacToolboxConfig;

  let status: number;
  try {
    validateClis(CliName.Postgresql, {
      destination,
      filePath: tmpFile,
      profile,
      config,
    });

    print.success('Configuration loaded');
    print.pipe();

    // ── Ansible Invocation ────────────────────────────────────
    print.step('Deploying PostgreSQL...');
    print.divider();

    status = runAnsiblePlaybook('postgresql.yml', {
      ansibleDir: resolveAnsibleDir(destination),
      filePath: tmpFile,
      projectRoot: resolveProjectRoot(),
      env: { ...process.env },
      extraVars: { postgres_password: postgresPassword },
    });
  } finally {
    unlinkSync(tmpFile);
  }

  if (status !== 0) {
    print.blank();
    print.step('PostgreSQL install failed');
    print.pipe();
    print.error('Ansible playbook exited with errors');
    print.pipe('Check output above for details');
    print.pipe();
    print.pipe('To retry: iac-toolbox postgresql install');
    print.closeError();
    process.exit(status ?? 1);
  }

  const port = config.postgresql?.port ?? 5432;
  const database = config.postgresql?.database ?? 'postgres';

  print.blank();
  print.step('PostgreSQL is running');
  print.pipe();
  print.pipe('Host            localhost');
  print.pipe(`Port            ${port}`);
  print.pipe(`Database        ${database}`);
  print.pipe('User            postgres');
  print.pipe();
  print.pipe('Connect locally:');
  print.pipe(`  psql -h localhost -p ${port} -U postgres -d ${database}`);
  print.pipe();
  print.pipe('Connection string:');
  print.pipe(`  postgresql://postgres@localhost:${port}/${database}`);
  print.close();
}
