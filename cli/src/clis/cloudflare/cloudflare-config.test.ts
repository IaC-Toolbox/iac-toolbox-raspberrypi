import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import {
  loadCloudflareConfig,
  updateCloudflareConfig,
} from './cloudflare-config.js';

// ---------------------------------------------------------------------------
// Use real filesystem with temp directories instead of mocking fs,
// since jest.mock('fs') does not work reliably with ESM modules.
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// loadCloudflareConfig
// ---------------------------------------------------------------------------
describe('loadCloudflareConfig', () => {
  it('returns undefined when config file does not exist', () => {
    const subDir = path.join(tmpDir, 'nonexistent');
    const result = loadCloudflareConfig(subDir);
    expect(result).toBeUndefined();
  });

  it('returns undefined when cloudflare section is absent', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(configPath, yaml.dump({ grafana: { enabled: true } }));

    const result = loadCloudflareConfig(tmpDir);
    expect(result).toBeUndefined();
  });

  it('returns the cloudflare section when set', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(
      configPath,
      yaml.dump({
        cloudflare: {
          enabled: true,
          mode: 'api',
          account_id: 'a'.repeat(32),
          zone_id: 'b'.repeat(32),
          tunnel_name: 'test-tunnel',
          domains: [
            {
              hostname: 'app.example.com',
              service_port: 3000,
              service: 'http://localhost:3000',
            },
          ],
        },
      })
    );

    const result = loadCloudflareConfig(tmpDir);
    expect(result).toBeDefined();
    expect(result!.account_id).toBe('a'.repeat(32));
    expect(result!.zone_id).toBe('b'.repeat(32));
    expect(result!.tunnel_name).toBe('test-tunnel');
    expect(result!.domains).toHaveLength(1);
    expect(result!.domains![0].hostname).toBe('app.example.com');
  });
});

// ---------------------------------------------------------------------------
// updateCloudflareConfig
// ---------------------------------------------------------------------------
describe('updateCloudflareConfig', () => {
  it('creates new config with cloudflare section when file does not exist', () => {
    updateCloudflareConfig(tmpDir, {
      accountId: 'a'.repeat(32),
      zoneId: 'b'.repeat(32),
      tunnelName: 'example-tunnel',
      hostname: 'grafana.example.com',
      servicePort: 3000,
    });

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('account_id');
    expect(content).toContain('a'.repeat(32));
    expect(content).toContain('zone_id');
    expect(content).toContain('tunnel_name');
    expect(content).toContain('example-tunnel');
    expect(content).toContain('grafana.example.com');
    expect(content).toContain('enabled: true');
    expect(content).toContain('mode: api');
  });

  it('preserves existing config and merges cloudflare section', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const existing = yaml.dump({
      grafana: { enabled: true, admin_user: 'admin' },
      cloudflare: { custom_key: 'keep_me' },
    });
    fs.writeFileSync(configPath, existing);

    updateCloudflareConfig(tmpDir, {
      accountId: 'c'.repeat(32),
      zoneId: 'd'.repeat(32),
      tunnelName: 'my-tunnel',
      hostname: 'app.example.com',
      servicePort: 8080,
    });

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;

    // Should preserve grafana section
    expect(content).toContain('grafana');
    // Should preserve custom_key from existing cloudflare config
    expect((parsed.cloudflare as Record<string, unknown>).custom_key).toBe(
      'keep_me'
    );
    // Should have new cloudflare values
    expect((parsed.cloudflare as Record<string, unknown>).account_id).toBe(
      'c'.repeat(32)
    );
    expect((parsed.cloudflare as Record<string, unknown>).tunnel_name).toBe(
      'my-tunnel'
    );
  });

  it('sets cloudflare_api_token to Ansible variable reference', () => {
    updateCloudflareConfig(tmpDir, {
      accountId: 'a'.repeat(32),
      zoneId: 'b'.repeat(32),
      tunnelName: 'test-tunnel',
      hostname: 'app.example.com',
      servicePort: 3000,
    });

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('{{ cloudflare_api_token }}');
  });

  it('writes domains array with hostname, service_port, and service', () => {
    updateCloudflareConfig(tmpDir, {
      accountId: 'a'.repeat(32),
      zoneId: 'b'.repeat(32),
      tunnelName: 'test-tunnel',
      hostname: 'grafana.example.com',
      servicePort: 3000,
    });

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    const cf = parsed.cloudflare as Record<string, unknown>;
    const domains = cf.domains as Array<Record<string, unknown>>;

    expect(domains).toHaveLength(1);
    expect(domains[0].hostname).toBe('grafana.example.com');
    expect(domains[0].service_port).toBe(3000);
    expect(domains[0].service).toBe('http://localhost:3000');
  });

  it('adds header comment to generated config', () => {
    updateCloudflareConfig(tmpDir, {
      accountId: 'a'.repeat(32),
      zoneId: 'b'.repeat(32),
      tunnelName: 'test-tunnel',
      hostname: 'app.example.com',
      servicePort: 3000,
    });

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('Generated by iac-toolbox');
    expect(content).toContain('no secrets');
  });
});
