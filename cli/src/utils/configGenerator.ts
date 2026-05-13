import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

interface WizardConfig {
  deviceType: string;
  connection: {
    host: string;
    user: string;
    sshKey?: string;
  };
  directory: string;
  docker: { enabled: boolean };
  vault: {
    enabled: boolean;
    storagePath?: string;
    port?: number;
  };
  cloudflare: {
    enabled: boolean;
    mode?: string;
    domain?: string;
    token?: string;
    accountId?: string;
    zoneId?: string;
    tunnelName?: string;
    services?: Array<{ subdomain: string; port: number; hostname?: string }>;
  };
  grafana: {
    enabled: boolean;
    adminUser?: string;
    adminPassword?: string;
  };
  prometheus: {
    enabled: boolean;
    retentionDays?: number;
    scrapeInterval?: string;
  };
  pagerDuty: {
    enabled: boolean;
    token?: string;
    serviceRegion?: string;
    userEmail?: string;
    alertEmail?: string;
  };
  githubRunner: {
    enabled: boolean;
    repoUrl?: string;
    runnerToken?: string;
    version?: string;
    labels?: string;
    generateWorkflow?: boolean;
  };
}

interface YamlConfig {
  docker?: { enabled: boolean };
  vault?: {
    enabled: boolean;
    version: string;
    base_dir: string;
    port: number;
    enable_kv: boolean;
    enable_audit: boolean;
  };
  cloudflare?: {
    enabled: boolean;
    mode: string;
    tunnel_name: string;
    account_id: string;
    zone_id: string;
    domains: Array<{
      hostname: string;
      service_port: number;
      service: string;
    }>;
  };
  grafana?: {
    enabled: boolean;
    version: string;
    base_dir: string;
    port: number;
    admin_user: string;
    admin_password: string;
    vault_path: string;
    domain: string;
  };
  prometheus?: {
    enabled: boolean;
    version: string;
    base_dir: string;
    port: number;
    scrape_interval: string;
    retention: string;
  };
  node_exporter?: {
    version: string;
    port: number;
  };
  github_runner?: {
    enabled: boolean;
    repo_url: string;
    token: string;
    version: string;
    labels: string;
    work_dir: string;
  };
}

function generateConfigYaml(config: WizardConfig): string {
  const yamlConfig: YamlConfig = {};

  if (config.docker.enabled) {
    yamlConfig.docker = { enabled: true };
  }

  if (config.vault.enabled) {
    yamlConfig.vault = {
      enabled: true,
      version: 'latest',
      base_dir: config.vault.storagePath || '/home/{{ ansible_user }}/vault',
      port: config.vault.port || 8200,
      enable_kv: true,
      enable_audit: true,
    };
  }

  if (config.cloudflare.enabled) {
    const domains =
      config.cloudflare.services?.map((s) => ({
        hostname: s.hostname || `${s.subdomain}.${config.cloudflare.domain}`,
        service_port: s.port,
        service: `http://localhost:${s.port}`,
      })) || [];

    yamlConfig.cloudflare = {
      enabled: true,
      mode: config.cloudflare.mode || 'api',
      tunnel_name: config.cloudflare.tunnelName || 'main-backend-tunnel',
      account_id: config.cloudflare.accountId || '',
      zone_id: config.cloudflare.zoneId || '',
      domains,
    };
  }

  if (config.grafana.enabled) {
    yamlConfig.grafana = {
      enabled: true,
      version: 'latest',
      base_dir: '/home/{{ ansible_user }}/grafana',
      port: 3000,
      admin_user: config.grafana.adminUser || 'admin',
      admin_password: "{{ lookup('env', 'GRAFANA_ADMIN_PASSWORD') }}",
      vault_path: 'kv/observability/grafana',
      domain: `grafana.${config.cloudflare.domain || '{{ cloudflare_domain }}'}`,
    };
  }

  if (config.prometheus.enabled) {
    yamlConfig.prometheus = {
      enabled: true,
      version: 'latest',
      base_dir: '/home/{{ ansible_user }}/observability',
      port: 9090,
      scrape_interval: config.prometheus.scrapeInterval || '15s',
      retention: `${config.prometheus.retentionDays || 15}d`,
    };
    yamlConfig.node_exporter = {
      version: 'latest',
      port: 9100,
    };
  }

  if (config.githubRunner.enabled) {
    yamlConfig.github_runner = {
      enabled: true,
      repo_url: "{{ lookup('env', 'GITHUB_REPO_URL') }}",
      token: "{{ lookup('env', 'GITHUB_RUNNER_TOKEN') }}",
      version: config.githubRunner.version || '2.333.0',
      labels: config.githubRunner.labels || 'rpi,arm64,docker',
      work_dir: '/home/{{ ansible_user }}/actions-runner',
    };
  }

  return yaml.dump(yamlConfig);
}

function generateEnvFile(config: WizardConfig): string {
  const lines: string[] = [];

  if (config.connection.sshKey) {
    lines.push('# Connection');
    lines.push(`RPI_SSH_KEY=${config.connection.sshKey}`);
    lines.push('');
  }

  if (config.githubRunner.enabled && config.githubRunner.repoUrl) {
    lines.push('# GitHub Runner');
    lines.push(`GITHUB_REPO_URL=${config.githubRunner.repoUrl}`);
    if (config.githubRunner.runnerToken) {
      lines.push(`GITHUB_RUNNER_TOKEN=${config.githubRunner.runnerToken}`);
    }
    lines.push(`RUNNER_VERSION=${config.githubRunner.version || '2.333.0'}`);
    lines.push(
      `RUNNER_LABELS=${config.githubRunner.labels || 'rpi,arm64,docker'}`
    );
    lines.push('');
  }

  if (config.cloudflare.enabled && config.cloudflare.mode === 'api') {
    lines.push('# Cloudflare');
    if (config.cloudflare.token) {
      lines.push(`CLOUDFLARE_API_TOKEN=${config.cloudflare.token}`);
    }
    if (config.cloudflare.accountId) {
      lines.push(`CLOUDFLARE_ACCOUNT_ID=${config.cloudflare.accountId}`);
    }
    if (config.cloudflare.zoneId) {
      lines.push(`CLOUDFLARE_ZONE_ID=${config.cloudflare.zoneId}`);
    }
    lines.push('');
  }

  if (config.grafana.enabled) {
    lines.push('# Grafana');
    lines.push(`GRAFANA_ADMIN_USER=${config.grafana.adminUser || 'admin'}`);
    if (config.grafana.adminPassword) {
      lines.push(`GRAFANA_ADMIN_PASSWORD=${config.grafana.adminPassword}`);
    }
    lines.push('');
  }

  if (config.pagerDuty.enabled) {
    lines.push('# Alerts');
    if (config.pagerDuty.alertEmail) {
      lines.push(`ALERT_EMAIL=${config.pagerDuty.alertEmail}`);
    }
    if (config.pagerDuty.token) {
      lines.push(`PAGERDUTY_TOKEN=${config.pagerDuty.token}`);
    }
    if (config.pagerDuty.serviceRegion) {
      lines.push(`PAGERDUTY_SERVICE_REGION=${config.pagerDuty.serviceRegion}`);
    }
    if (config.pagerDuty.userEmail) {
      lines.push(`PAGERDUTY_USER_EMAIL=${config.pagerDuty.userEmail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function generateConfigFiles(
  config: WizardConfig
): Promise<{ configPath: string; envPath: string; inventoryPath: string }> {
  const baseDir = config.directory;
  const ansibleDir = path.join(baseDir, 'ansible-configurations');
  const inventoryDir = path.join(ansibleDir, 'inventory');

  // Ensure directories exist
  await fs.mkdir(ansibleDir, { recursive: true });
  await fs.mkdir(inventoryDir, { recursive: true });

  // Generate and write config.yml
  const configYaml = generateConfigYaml(config);
  const configPath = path.join(ansibleDir, 'config.yml');
  await fs.writeFile(configPath, configYaml, 'utf-8');

  // Generate and write .env
  const envContent = generateEnvFile(config);
  const envPath = path.join(baseDir, '.env');
  await fs.writeFile(envPath, envContent, 'utf-8');

  // Generate and write inventory/all.yml (simplified)
  const inventoryYaml = yaml.dump({
    all: {
      hosts: {
        raspberry_pi: {
          ansible_ssh_private_key_file:
            "{{ lookup('env', 'RPI_SSH_KEY') | default('~/.ssh/id_ed25519') }}",
        },
      },
    },
  });
  const inventoryPath = path.join(inventoryDir, 'all.yml');
  await fs.writeFile(inventoryPath, inventoryYaml, 'utf-8');

  return { configPath, envPath, inventoryPath };
}

export type { WizardConfig };
export { generateConfigYaml, generateEnvFile, generateConfigFiles };

// ---------------------------------------------------------------------------
// New wizard-level config generator for iac-toolbox platform init
// ---------------------------------------------------------------------------

export interface WizardInputs {
  targetMode: 'local' | 'remote';
  sshHost?: string;
  sshUser?: string;
  sshKey?: string;
  cloudflareEnabled: boolean;
  domain?: string;
  cloudflareAccountId?: string;
  cloudflareZoneId?: string;
}

/**
 * Derive a random 10-character alphanumeric+symbol password.
 */
export function generatePassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@!$%&';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Derive tunnel name from domain: "iac-toolbox.com" -> "iac-toolbox-com-tunnel"
 */
export function deriveTunnelName(domain: string): string {
  return domain.replace(/\./g, '-') + '-tunnel';
}

/**
 * Derive Alloy remote_write URL.
 * Cloudflare: https://prometheus.<domain>/api/v1/write
 * Local:      http://localhost:9090/api/v1/write
 */
export function deriveRemoteWriteUrl(domain?: string): string {
  if (domain) {
    return `https://prometheus.${domain}/api/v1/write`;
  }
  return 'http://localhost:9090/api/v1/write';
}

/**
 * Derive the full iac-toolbox.yml content from wizard inputs.
 * Returns a YAML string safe to write directly to disk.
 */
export function generateConfig(inputs: WizardInputs): string {
  const lines: string[] = [
    '# Generated by iac-toolbox platform init',
    '# Safe to commit — no secrets stored here',
    '',
    'device:',
    '  profile: platform',
    '',
    'docker:',
    '  enabled: true',
    '',
  ];

  if (inputs.cloudflareEnabled && inputs.domain) {
    const tunnelName = deriveTunnelName(inputs.domain);
    lines.push('cloudflare:');
    lines.push('  enabled: true');
    lines.push('  mode: api');
    lines.push(`  account_id: ${inputs.cloudflareAccountId ?? ''}`);
    lines.push(`  zone_id: ${inputs.cloudflareZoneId ?? ''}`);
    lines.push(`  tunnel_name: ${tunnelName}`);
    lines.push('  cloudflare_api_token: "{{ cloudflare_api_token }}"');
    lines.push('  domains:');
    lines.push(`    - hostname: grafana.${inputs.domain}`);
    lines.push('      service_port: 3000');
    lines.push('      service: http://localhost:3000');
    lines.push(`    - hostname: prometheus.${inputs.domain}`);
    lines.push('      service_port: 9090');
    lines.push('      service: http://localhost:9090');
    lines.push('');
    lines.push('grafana:');
    lines.push('  enabled: true');
    lines.push('  version: latest');
    lines.push('  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana"');
    lines.push('  port: 3000');
    lines.push(`  domain: grafana.${inputs.domain}`);
    lines.push(
      '  provisioning_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana/provisioning"'
    );
    lines.push('  prometheus_port: 9090');
    lines.push(`  prometheus_domain: prometheus.${inputs.domain}`);
    lines.push('  admin_user: admin');
    lines.push('  admin_password: "{{ grafana_admin_password }}"');
    lines.push('');
    lines.push('prometheus:');
    lines.push('  enabled: true');
    lines.push('  version: latest');
    lines.push('  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/prometheus"');
    lines.push(`  domain: prometheus.${inputs.domain}`);
    lines.push('  port: 9090');
    lines.push('  scrape_interval: 15s');
    lines.push('  retention: 15d');
    lines.push(`  grafana_url: https://grafana.${inputs.domain}`);
  } else {
    lines.push('cloudflare:');
    lines.push('  enabled: false');
    lines.push('');
    lines.push('grafana:');
    lines.push('  enabled: true');
    lines.push('  version: latest');
    lines.push('  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana"');
    lines.push('  port: 3000');
    lines.push('  domain: ""');
    lines.push(
      '  provisioning_dir: "{{ ansible_env.HOME }}/.iac-toolbox/grafana/provisioning"'
    );
    lines.push('  prometheus_port: 9090');
    lines.push('  prometheus_domain: ""');
    lines.push('  admin_user: admin');
    lines.push('  admin_password: "{{ grafana_admin_password }}"');
    lines.push('');
    lines.push('prometheus:');
    lines.push('  enabled: true');
    lines.push('  version: latest');
    lines.push('  base_dir: "{{ ansible_env.HOME }}/.iac-toolbox/prometheus"');
    lines.push('  domain: ""');
    lines.push('  port: 9090');
    lines.push('  scrape_interval: 15s');
    lines.push('  retention: 15d');
    lines.push('  grafana_url: http://localhost:3000');
  }

  lines.push('');

  if (inputs.targetMode === 'remote') {
    lines.push('target:');
    lines.push('  mode: remote');
    lines.push(`  host: ${inputs.sshHost ?? ''}`);
    lines.push(`  user: ${inputs.sshUser ?? ''}`);
    lines.push(`  ssh_key: ${inputs.sshKey ?? ''}`);
  } else {
    lines.push('target:');
    lines.push('  mode: local');
  }

  lines.push('');
  lines.push('grafana_alloy:');
  lines.push('  enabled: true');
  lines.push(
    `  alloy_remote_write_url: ${deriveRemoteWriteUrl(inputs.cloudflareEnabled ? inputs.domain : undefined)}`
  );
  lines.push('');
  lines.push('node_exporter:');
  lines.push('  enabled: true');
  lines.push('');
  lines.push('cadvisor:');
  lines.push('  enabled: true');
  lines.push('');

  return lines.join('\n');
}
