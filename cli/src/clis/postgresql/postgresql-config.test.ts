import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import {
  loadPostgresqlConfig,
  updatePostgresqlConfig,
} from './postgresql-config.js';

// ---------------------------------------------------------------------------
// Use real filesystem with temp directories instead of mocking fs,
// since jest.mock('fs') does not work reliably with ESM modules.
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postgresql-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// loadPostgresqlConfig
// ---------------------------------------------------------------------------
describe('loadPostgresqlConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const subDir = path.join(tmpDir, 'nonexistent');
    const result = loadPostgresqlConfig(subDir);
    expect(result.enabled).toBe(true);
    expect(result.port).toBe(5432);
    expect(result.database).toBe('postgres');
    expect(result.version).toBe('16');
  });

  it('returns defaults when postgresql section is absent', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(configPath, yaml.dump({ grafana: { enabled: true } }));

    const result = loadPostgresqlConfig(tmpDir);
    expect(result.enabled).toBe(true);
    expect(result.port).toBe(5432);
    expect(result.database).toBe('postgres');
    expect(result.version).toBe('16');
  });

  it('returns stored values when postgresql section is present', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(
      configPath,
      yaml.dump({
        postgresql: {
          enabled: true,
          port: 5433,
          database: 'myapp',
          version: '15',
        },
      })
    );

    const result = loadPostgresqlConfig(tmpDir);
    expect(result.port).toBe(5433);
    expect(result.database).toBe('myapp');
    expect(result.version).toBe('15');
  });

  it('reads from explicit filePath when provided', () => {
    const customPath = path.join(tmpDir, 'custom', 'raspberry-pi.yml');
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    fs.writeFileSync(
      customPath,
      yaml.dump({
        postgresql: {
          enabled: true,
          port: 9999,
          database: 'customdb',
          version: '14',
        },
      })
    );

    const result = loadPostgresqlConfig(tmpDir, customPath);
    expect(result.port).toBe(9999);
    expect(result.database).toBe('customdb');
    expect(result.version).toBe('14');
  });
});

// ---------------------------------------------------------------------------
// updatePostgresqlConfig
// ---------------------------------------------------------------------------
describe('updatePostgresqlConfig', () => {
  it('creates new config with postgresql section when file does not exist', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5432, database: 'postgres', version: '16' },
      'secret123',
      'default',
      configPath
    );

    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('postgresql');
    expect(content).toContain('enabled: true');
    expect(content).toContain('port: 5432');
    expect(content).toContain('database: postgres');
    expect(content).toContain('version:');
  });

  it('writes correct port, database, and version values', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5433, database: 'myapp', version: '15' },
      'secret123',
      'default',
      configPath
    );

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    const pg = parsed.postgresql as Record<string, unknown>;

    expect(pg.port).toBe(5433);
    expect(pg.database).toBe('myapp');
    expect(pg.enabled).toBe(true);
  });

  it('preserves existing config and merges postgresql section', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    const existing = yaml.dump({
      grafana: { enabled: true, admin_user: 'admin' },
      postgresql: { custom_key: 'keep_me' },
    });
    fs.writeFileSync(configPath, existing);

    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5432, database: 'postgres', version: '16' },
      'secret123',
      'default',
      configPath
    );

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;

    // Should preserve grafana section
    expect(content).toContain('grafana');
    // Should preserve custom_key from existing postgresql config
    expect((parsed.postgresql as Record<string, unknown>).custom_key).toBe(
      'keep_me'
    );
    // Should have new postgresql values
    expect((parsed.postgresql as Record<string, unknown>).port).toBe(5432);
    expect((parsed.postgresql as Record<string, unknown>).database).toBe(
      'postgres'
    );
  });

  it('does not write password to YAML file', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5432, database: 'postgres', version: '16' },
      'supersecretpassword',
      'default',
      configPath
    );

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).not.toContain('supersecretpassword');
    expect(content).not.toContain('postgres_password');
  });

  it('adds header comment to generated config', () => {
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5432, database: 'postgres', version: '16' },
      'secret123',
      'default',
      configPath
    );

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('Generated by iac-toolbox');
    expect(content).toContain('no secrets');
  });

  it('writes to explicit filePath when provided', () => {
    const customPath = path.join(tmpDir, 'custom', 'raspberry-pi.yml');
    fs.mkdirSync(path.dirname(customPath), { recursive: true });

    updatePostgresqlConfig(
      tmpDir,
      { enabled: true, port: 5432, database: 'postgres', version: '16' },
      'secret123',
      'default',
      customPath
    );

    expect(fs.existsSync(customPath)).toBe(true);
    const content = fs.readFileSync(customPath, 'utf-8');
    expect(content).toContain('postgresql');
  });
});
