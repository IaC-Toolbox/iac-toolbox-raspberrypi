import { describe, it, expect } from '@jest/globals';
import {
  generateConfigYaml,
  generateEnvFile,
  generateConfig,
  generatePassword,
  deriveTunnelName,
  deriveRemoteWriteUrl,
} from './configGenerator.js';
import type { WizardConfig, WizardInputs } from './configGenerator.js';

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

  it('includes ssh key connection detail', () => {
    const env = generateEnvFile(baseConfig);

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

// ---------------------------------------------------------------------------
// New wizard-level config generator tests
// ---------------------------------------------------------------------------

describe('generatePassword', () => {
  it('returns a 10-character string', () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(10);
  });

  it('returns a string with only allowed characters', () => {
    const pw = generatePassword();
    expect(pw).toMatch(/^[A-Za-z0-9#@!$%&]{10}$/);
  });

  it('generates different passwords each time (probabilistic)', () => {
    const pw1 = generatePassword();
    const pw2 = generatePassword();
    // Extremely unlikely to be equal, but not impossible
    expect(pw1 === pw2).not.toBe(true);
  });
});

describe('deriveTunnelName', () => {
  it('replaces dots with dashes and appends -tunnel', () => {
    expect(deriveTunnelName('iac-toolbox.com')).toBe('iac-toolbox-com-tunnel');
  });

  it('handles multiple dots', () => {
    expect(deriveTunnelName('sub.domain.example.com')).toBe(
      'sub-domain-example-com-tunnel'
    );
  });

  it('handles domain without subdomains', () => {
    expect(deriveTunnelName('example.io')).toBe('example-io-tunnel');
  });
});

describe('deriveRemoteWriteUrl', () => {
  it('returns local URL when no domain provided', () => {
    expect(deriveRemoteWriteUrl()).toBe('http://localhost:9090/api/v1/write');
  });

  it('returns local URL when domain is undefined', () => {
    expect(deriveRemoteWriteUrl(undefined)).toBe(
      'http://localhost:9090/api/v1/write'
    );
  });

  it('returns https prometheus subdomain URL when domain provided', () => {
    expect(deriveRemoteWriteUrl('iac-toolbox.com')).toBe(
      'https://prometheus.iac-toolbox.com/api/v1/write'
    );
  });
});

describe('generateConfig', () => {
  const remoteNoCloudflare: WizardInputs = {
    targetMode: 'remote',
    sshHost: 'raspberry-4b.local',
    sshUser: 'pi',
    sshKey: '~/.ssh/raspberrypi-4b',
    cloudflareEnabled: false,
  };

  const remoteWithCloudflare: WizardInputs = {
    targetMode: 'remote',
    sshHost: 'raspberry-4b.local',
    sshUser: 'pi',
    sshKey: '~/.ssh/raspberrypi-4b',
    cloudflareEnabled: true,
    domain: 'iac-toolbox.com',
    cloudflareAccountId: '6010b62692a2aa521314ec448f67fb92',
    cloudflareZoneId: 'f595ac9a556083288bc7fbe8a6dc2598',
  };

  const localNoCloudflare: WizardInputs = {
    targetMode: 'local',
    cloudflareEnabled: false,
  };

  it('contains comment header', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('# Generated by iac-toolbox platform init');
    expect(result).toContain('# Safe to commit');
  });

  it('includes docker enabled', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('docker:');
    expect(result).toContain('enabled: true');
  });

  it('includes cloudflare disabled when not enabled', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('cloudflare:');
    expect(result).toContain('enabled: false');
  });

  it('includes correct remote target info', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('mode: remote');
    expect(result).toContain('host: raspberry-4b.local');
    expect(result).toContain('user: pi');
    expect(result).toContain('ssh_key: ~/.ssh/raspberrypi-4b');
  });

  it('includes local target mode when local', () => {
    const result = generateConfig(localNoCloudflare);
    expect(result).toContain('mode: local');
    // SSH-specific fields must not appear in the target block
    expect(result).not.toContain('\n  host:');
    expect(result).not.toContain('\n  user:');
    expect(result).not.toContain('ssh_key:');
  });

  it('includes local alloy remote_write URL when cloudflare disabled', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain(
      'alloy_remote_write_url: http://localhost:9090/api/v1/write'
    );
  });

  it('includes grafana and prometheus sections', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('grafana:');
    expect(result).toContain('prometheus:');
  });

  it('includes node_exporter and cadvisor', () => {
    const result = generateConfig(remoteNoCloudflare);
    expect(result).toContain('node_exporter:');
    expect(result).toContain('cadvisor:');
  });

  it('does not include plaintext secrets', () => {
    const result = generateConfig(remoteNoCloudflare);
    // Passwords should only appear as Ansible variable references
    expect(result).not.toMatch(/admin_password:\s+"[^{]/);
    expect(result).toContain('{{ grafana_admin_password }}');
  });

  it('includes cloudflare config when enabled', () => {
    const result = generateConfig(remoteWithCloudflare);
    expect(result).toContain('enabled: true');
    expect(result).toContain('account_id: 6010b62692a2aa521314ec448f67fb92');
    expect(result).toContain('zone_id: f595ac9a556083288bc7fbe8a6dc2598');
    expect(result).toContain('tunnel_name: iac-toolbox-com-tunnel');
  });

  it('includes cloudflare_api_token as variable reference', () => {
    const result = generateConfig(remoteWithCloudflare);
    expect(result).toContain('{{ cloudflare_api_token }}');
    // Must not contain a real token
    expect(result).not.toMatch(/cloudflare_api_token:\s+"[^{]/);
  });

  it('includes domain-based grafana and prometheus URLs when cloudflare enabled', () => {
    const result = generateConfig(remoteWithCloudflare);
    expect(result).toContain('grafana.iac-toolbox.com');
    expect(result).toContain('prometheus.iac-toolbox.com');
  });

  it('includes https alloy remote_write URL when cloudflare enabled', () => {
    const result = generateConfig(remoteWithCloudflare);
    expect(result).toContain(
      'alloy_remote_write_url: https://prometheus.iac-toolbox.com/api/v1/write'
    );
  });

  it('includes domain-based domains list in cloudflare section', () => {
    const result = generateConfig(remoteWithCloudflare);
    expect(result).toContain('hostname: grafana.iac-toolbox.com');
    expect(result).toContain('hostname: prometheus.iac-toolbox.com');
  });
});
