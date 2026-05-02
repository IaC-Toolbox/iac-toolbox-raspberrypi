import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import {
  loadMetricsAgentRemoteWriteUrl,
  updateMetricsAgentConfig,
} from './metricsAgentConfig.js';

// ---------------------------------------------------------------------------
// Use real filesystem with temp directories instead of mocking fs,
// since jest.mock('fs') does not work reliably with ESM modules.
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-agent-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// loadMetricsAgentRemoteWriteUrl
// ---------------------------------------------------------------------------
describe('loadMetricsAgentRemoteWriteUrl', () => {
  it('returns undefined when key is absent', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(configPath, yaml.dump({ grafana: { enabled: true } }));

    const result = loadMetricsAgentRemoteWriteUrl(tmpDir);
    expect(result).toBeUndefined();
  });

  it('returns correct value when present', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(
      configPath,
      yaml.dump({
        grafana_alloy: {
          alloy_remote_write_url:
            'https://grafana.iac-toolbox.com/prometheus/api/v1/write',
        },
      })
    );

    const result = loadMetricsAgentRemoteWriteUrl(tmpDir);
    expect(result).toBe(
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );
  });
});

// ---------------------------------------------------------------------------
// updateMetricsAgentConfig
// ---------------------------------------------------------------------------
describe('updateMetricsAgentConfig', () => {
  it('creates file if absent', () => {
    updateMetricsAgentConfig(
      tmpDir,
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('alloy_remote_write_url');
    expect(content).toContain(
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );
  });

  it('preserves other keys in existing config', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const existing = yaml.dump({
      grafana: { enabled: true, admin_user: 'admin' },
      prometheus: { enabled: true, port: 9090 },
    });
    fs.writeFileSync(configPath, existing);

    updateMetricsAgentConfig(
      tmpDir,
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;

    // Should preserve grafana and prometheus sections
    expect(content).toContain('grafana');
    expect(content).toContain('prometheus');
    expect((parsed.grafana as Record<string, unknown>).admin_user).toBe(
      'admin'
    );
    expect((parsed.prometheus as Record<string, unknown>).port).toBe(9090);
  });

  it('sets correct node_exporter and grafana_alloy values', () => {
    updateMetricsAgentConfig(
      tmpDir,
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );

    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect((parsed.node_exporter as Record<string, unknown>).enabled).toBe(
      true
    );
    expect((parsed.grafana_alloy as Record<string, unknown>).enabled).toBe(
      true
    );
    expect(
      (parsed.grafana_alloy as Record<string, unknown>).alloy_remote_write_url
    ).toBe('https://grafana.iac-toolbox.com/prometheus/api/v1/write');
  });
});
