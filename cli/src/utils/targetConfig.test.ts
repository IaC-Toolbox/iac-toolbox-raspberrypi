import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  loadTargetConfig,
  updateTargetConfig,
  buildTargetEnv,
} from './targetConfig.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iac-toolbox-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// loadTargetConfig
// ---------------------------------------------------------------------------

describe('loadTargetConfig', () => {
  it('returns local defaults when no iac-toolbox.yml exists', () => {
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });

  it('returns local defaults when iac-toolbox.yml has no target section', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'iac-toolbox.yml'),
      'grafana:\n  enabled: true\n',
      'utf-8'
    );
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });

  it('returns local mode when target.mode is local', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'iac-toolbox.yml'),
      'target:\n  mode: local\n',
      'utf-8'
    );
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });

  it('returns remote config when target.mode is remote', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'iac-toolbox.yml'),
      'target:\n  mode: remote\n  host: 192.168.1.50\n  user: pi\n  ssh_key: ~/.ssh/id_ed25519\n',
      'utf-8'
    );
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({
      mode: 'remote',
      host: '192.168.1.50',
      user: 'pi',
      ssh_key: '~/.ssh/id_ed25519',
    });
  });

  it('returns local defaults when file is malformed', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'iac-toolbox.yml'),
      'not: valid: yaml: {{{',
      'utf-8'
    );
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });
});

// ---------------------------------------------------------------------------
// updateTargetConfig
// ---------------------------------------------------------------------------

describe('updateTargetConfig', () => {
  it('writes local mode to a new file', () => {
    updateTargetConfig(tmpDir, { mode: 'local' });
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });

  it('writes remote mode with host, user, and ssh_key', () => {
    updateTargetConfig(tmpDir, {
      mode: 'remote',
      host: '10.0.0.5',
      user: 'ubuntu',
      ssh_key: '~/.ssh/custom_key',
    });
    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({
      mode: 'remote',
      host: '10.0.0.5',
      user: 'ubuntu',
      ssh_key: '~/.ssh/custom_key',
    });
  });

  it('preserves other keys in iac-toolbox.yml when updating target', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'iac-toolbox.yml'),
      'grafana:\n  enabled: true\n  admin_user: admin\n',
      'utf-8'
    );
    updateTargetConfig(tmpDir, { mode: 'local' });

    const raw = fs.readFileSync(path.join(tmpDir, 'iac-toolbox.yml'), 'utf-8');
    expect(raw).toContain('grafana');
    expect(raw).toContain('target');
  });

  it('overwrites an existing target section', () => {
    updateTargetConfig(tmpDir, {
      mode: 'remote',
      host: '1.2.3.4',
      user: 'pi',
      ssh_key: '~/.ssh/id_ed25519',
    });
    updateTargetConfig(tmpDir, { mode: 'local' });

    const config = loadTargetConfig(tmpDir);
    expect(config).toEqual({ mode: 'local' });
  });
});

// ---------------------------------------------------------------------------
// buildTargetEnv
// ---------------------------------------------------------------------------

describe('buildTargetEnv', () => {
  it('returns ssh key default and local flag when no config exists', () => {
    const env = buildTargetEnv(tmpDir);
    expect(env).toEqual({
      RPI_SSH_KEY: '~/.ssh/id_ed25519',
      RPI_LOCAL: 'true',
    });
  });

  it('returns ssh key default and local flag when config has local mode', () => {
    updateTargetConfig(tmpDir, { mode: 'local' });
    const env = buildTargetEnv(tmpDir);
    expect(env).toEqual({
      RPI_SSH_KEY: '~/.ssh/id_ed25519',
      RPI_LOCAL: 'true',
    });
  });

  it('returns ssh key and remote flag when config has remote mode', () => {
    updateTargetConfig(tmpDir, {
      mode: 'remote',
      host: '192.168.1.100',
      user: 'pi',
      ssh_key: '~/.ssh/pi_key',
    });
    const env = buildTargetEnv(tmpDir);
    expect(env).toEqual({
      RPI_SSH_KEY: '~/.ssh/pi_key',
      RPI_LOCAL: 'false',
    });
  });

  it('sets RPI_LOCAL to false for remote mode', () => {
    updateTargetConfig(tmpDir, {
      mode: 'remote',
      host: '10.0.0.1',
      user: 'ubuntu',
      ssh_key: '~/.ssh/id_rsa',
    });
    const env = buildTargetEnv(tmpDir);
    expect(env.RPI_LOCAL).toBe('false');
  });

  it('sets RPI_LOCAL to true for local mode', () => {
    updateTargetConfig(tmpDir, { mode: 'local' });
    const env = buildTargetEnv(tmpDir);
    expect(env.RPI_LOCAL).toBe('true');
  });
});
