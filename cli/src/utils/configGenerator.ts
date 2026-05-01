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

  lines.push('# Connection');
  lines.push(`RPI_HOST=${config.connection.host}`);
  lines.push(`RPI_USER=${config.connection.user}`);
  if (config.connection.sshKey) {
    lines.push(`RPI_SSH_KEY=${config.connection.sshKey}`);
  }
  lines.push('');

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
          ansible_host: "{{ lookup('env', 'RPI_HOST') }}",
          ansible_user: "{{ lookup('env', 'RPI_USER') }}",
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
