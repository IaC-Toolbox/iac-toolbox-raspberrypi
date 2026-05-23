import { print } from '../../design-system/print.js';
import { runCAdvisorUninstall } from '../cadvisor/cadvisor-uninstall.js';
import { runGrafanaAlloyUninstall } from './grafana-alloy-uninstall.js';
import { runNodeExporterUninstall } from './node-exporter-uninstall.js';

export async function runMetricsAgentUninstall(
  destination: string,
  profile: string,
  filePath?: string
): Promise<void> {
  print.step('Uninstalling observability agent...');
  print.divider();

  print.step('Removing cAdvisor...');
  await runCAdvisorUninstall(destination, profile, filePath);

  print.step('Removing Grafana Alloy...');
  await runGrafanaAlloyUninstall(destination, profile, filePath);

  print.step('Removing Node Exporter...');
  await runNodeExporterUninstall(destination, profile, filePath);

  print.blank();
  print.step('Observability agent removed');
  print.pipe();
  print.success('cAdvisor removed');
  print.success('Grafana Alloy removed');
  print.success('Node Exporter removed');
  print.pipe();
  print.close();
}
