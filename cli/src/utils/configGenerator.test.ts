import { describe, it, expect } from '@jest/globals';
import { generateConfigYaml, generateEnvFile } from './configGenerator.js';
import type { WizardConfig } from './configGenerator.js';

describe('generateConfigYaml', () => {
  const baseConfig: WizardConfig = {
    deviceType: 'remote',
    connection: { host: '192.168.1.10', user: 'pi' },
    directory: '/opt/iac',
    docker: { enabled: false },
    vault: { enabled: false },
    cloudflare: { enabled: false },
    grafana: { enabled: false },
    prometheus: { enabled: false },
    pagerDuty: { enabled: false },
    githubRunner: { enabled: false },
  };

  it('generates minimal config with docker only', () => {
    const config = { ...baseConfig, docker: { enabled: true } };
    const yaml = generateConfigYaml(config);

    expect(yaml).toContain('docker:');
    expect(yaml).toContain('enabled: true');
  });

  it('includes vault config when enabled', () => {
    const config = {
      ...baseConfig,
      vault: { enabled: true, storagePath: '/home/pi/vault', port: 8200 },
    };
    const yaml = generateConfigYaml(config);

    expect(yaml).toContain('vault:');
    expect(yaml).toContain('enabled: true');
    expect(yaml).toContain('base_dir: /home/pi/vault');
    expect(yaml).toContain('port: 8200');
  });

  it('includes cloudflare config when enabled', () => {
    const config = {
      ...baseConfig,
      cloudflare: {
        enabled: true,
        mode: 'api',
        tunnelName: 'homelab',
        accountId: 'acc123',
        zoneId: 'zone456',
        domain: 'example.com',
        services: [{ subdomain: 'app', port: 3000 }],
      },
    };
    const yaml = generateConfigYaml(config);

    expect(yaml).toContain('cloudflare:');
    expect(yaml).toContain('tunnel_name: homelab');
    expect(yaml).toContain('account_id: acc123');
  });

  it('includes grafana config when enabled', () => {
    const config = {
      ...baseConfig,
      cloudflare: { enabled: true, domain: 'example.com' },
      grafana: { enabled: true, adminUser: 'admin', adminPassword: 'secret' },
    };
    const yaml = generateConfigYaml(config);

    expect(yaml).toContain('grafana:');
    expect(yaml).toContain('admin_user: admin');
  });
});

describe('generateEnvFile', () => {
  const baseConfig: WizardConfig = {
    deviceType: 'remote',
    connection: { host: '192.168.1.10', user: 'pi', sshKey: '~/.ssh/id_rsa' },
    directory: '/opt/iac',
    docker: { enabled: false },
    vault: { enabled: false },
    cloudflare: { enabled: false },
    grafana: { enabled: false },
    prometheus: { enabled: false },
    pagerDuty: { enabled: false },
    githubRunner: { enabled: false },
  };

  it('includes connection details', () => {
    const env = generateEnvFile(baseConfig);

    expect(env).toContain('RPI_HOST=192.168.1.10');
    expect(env).toContain('RPI_USER=pi');
    expect(env).toContain('RPI_SSH_KEY=~/.ssh/id_rsa');
  });

  it('includes cloudflare credentials when enabled', () => {
    const config = {
      ...baseConfig,
      cloudflare: {
        enabled: true,
        mode: 'api',
        token: 'cf_token',
        accountId: 'acc123',
        zoneId: 'zone456',
      },
    };
    const env = generateEnvFile(config);

    expect(env).toContain('CLOUDFLARE_API_TOKEN=cf_token');
    expect(env).toContain('CLOUDFLARE_ACCOUNT_ID=acc123');
  });

  it('includes grafana credentials when enabled', () => {
    const config = {
      ...baseConfig,
      grafana: { enabled: true, adminUser: 'admin', adminPassword: 'secret' },
    };
    const env = generateEnvFile(config);

    expect(env).toContain('GRAFANA_ADMIN_USER=admin');
    expect(env).toContain('GRAFANA_ADMIN_PASSWORD=secret');
  });
});
