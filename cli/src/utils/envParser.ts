import { readFileSync, existsSync } from 'fs';

export interface EnvConfig {
  RPI_SSH_KEY?: string;
  GITHUB_REPO_URL?: string;
  GITHUB_RUNNER_TOKEN?: string;
  RUNNER_VERSION?: string;
  RUNNER_LABELS?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_ID?: string;
  GRAFANA_ADMIN_USER?: string;
  GRAFANA_ADMIN_PASSWORD?: string;
  PAGERDUTY_TOKEN?: string;
  PAGERDUTY_SERVICE_REGION?: string;
  PAGERDUTY_USER_EMAIL?: string;
  ALERT_EMAIL?: string;
  VAULT_STORAGE_PATH?: string;
  VAULT_PORT?: string;
  PROMETHEUS_RETENTION?: string;
  PROMETHEUS_SCRAPE_INTERVAL?: string;
}

export function parseEnvFile(filePath: string): EnvConfig {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const config: EnvConfig = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.replace(/^["']|["']$/g, '');
        config[key as keyof EnvConfig] = cleanValue;
      }
    });

    return config;
  } catch (error) {
    return {};
  }
}
