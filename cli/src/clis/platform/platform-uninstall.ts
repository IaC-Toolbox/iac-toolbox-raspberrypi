import { unlinkSync } from 'fs';
import yaml from 'js-yaml';
import { print } from '../../design-system/print.js';
import { writeResolvedConfig } from '../../loaders/resolved-config.js';
import {
  testSshConnection,
  checkDockerAvailable,
} from '../../validators/preflight_checks.js';
import { runGrafanaUninstall } from '../grafana/grafana-uninstall.js';
import { runPrometheusUninstall } from '../prometheus/prometheus-uninstall.js';
import { runMetricsAgentUninstall } from '../metrics-agent/metrics-agent-uninstall.js';
import { runCloudflareUninstall } from '../cloudflare/cloudflare-uninstall.js';
import { runLokiUninstall } from '../loki/loki-uninstall.js';

export async function runPlatformUninstall(
  destination: string,
  profile: string,
  filePath: string
): Promise<void> {
  print.step('Pre-flight checks');

  const { tmpFile, resolvedYaml } = writeResolvedConfig(
    destination,
    profile,
    filePath
  );
  const config = yaml.load(resolvedYaml) as Record<string, unknown>;

  const targetMode =
    (config.target as { mode?: string } | undefined)?.mode ?? 'local';
  const targetHost =
    (config.target as { host?: string } | undefined)?.host ?? 'localhost';
  const targetUser =
    (config.target as { user?: string } | undefined)?.user ?? 'pi';
  const targetSshKey =
    (config.target as { ssh_key?: string } | undefined)?.ssh_key ??
    '~/.ssh/id_ed25519';

  if (targetMode === 'remote') {
    print.waiting(`Testing SSH connection to ${targetUser}@${targetHost}...`);
    const sshOk = await testSshConnection(targetHost, targetUser, targetSshKey);
    if (!sshOk) {
      print.error(`SSH connection failed to ${targetUser}@${targetHost}`);
      print.pipe();
      print.pipe('Ensure the host is reachable and the SSH key is correct.');
      print.pipe('Fix connectivity, then re-run uninstall.');
      print.closeError();
      unlinkSync(tmpFile);
      process.exit(1);
    }
    print.success('SSH connection successful');
  }

  const dockerOk = checkDockerAvailable(
    targetMode,
    targetHost,
    targetUser,
    targetSshKey
  );
  if (!dockerOk) {
    print.error('Docker not available on target');
    print.pipe();
    print.pipe('Ensure Docker is installed and running on the target.');
    print.closeError();
    unlinkSync(tmpFile);
    process.exit(1);
  }
  print.success('Docker available on target');
  print.close();

  unlinkSync(tmpFile);

  const cloudflareEnabled =
    (config.cloudflare as { enabled?: boolean } | undefined)?.enabled === true;
  const lokiEnabled =
    (config.loki as { enabled?: boolean } | undefined)?.enabled === true;

  print.step('Uninstalling observability platform...');
  print.divider();

  if (cloudflareEnabled) {
    await runCloudflareUninstall(destination, profile, filePath);
  }

  await runGrafanaUninstall(destination, profile, filePath);

  if (lokiEnabled) {
    await runLokiUninstall(destination, profile, filePath);
  }

  await runPrometheusUninstall(destination, profile, filePath);
  await runMetricsAgentUninstall(destination, profile, filePath);

  print.blank();
  print.step('Platform removed');
  print.pipe();
  if (cloudflareEnabled) print.success('Cloudflare Tunnel removed');
  print.success('Grafana removed');
  if (lokiEnabled) print.success('Loki removed');
  print.success('Prometheus removed');
  print.success('Observability agent removed');
  print.pipe();
  print.close();
}
