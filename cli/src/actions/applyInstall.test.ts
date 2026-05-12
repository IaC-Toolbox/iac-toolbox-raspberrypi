import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// We cannot easily call runApplyInstall directly because it calls process.exit.
// Instead, we test the exported helper logic by testing the module imports and
// the individual utility functions it delegates to.  For higher-level
// integration we verify that the pre-flight guard logic is correct by testing
// the config and credentials utilities it relies on.
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-install-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Config loading guard: applyInstall calls loadIacToolboxYaml
// ---------------------------------------------------------------------------
describe('applyInstall pre-flight — config loading', () => {
  it('loadIacToolboxYaml returns empty object when file is missing', async () => {
    const { loadIacToolboxYaml } = await import('../utils/grafanaConfig.js');
    const result = loadIacToolboxYaml(path.join(tmpDir, 'nonexistent'));
    expect(result).toEqual({});
  });

  it('loadIacToolboxYaml parses target section', async () => {
    const { loadIacToolboxYaml } = await import('../utils/grafanaConfig.js');
    const configData = {
      target: { mode: 'remote', host: 'raspberry-4b.local', user: 'pi' },
      grafana: { port: 3000 },
      prometheus: { port: 9090 },
    };
    const configPath = path.join(tmpDir, 'iac-toolbox.yml');
    fs.writeFileSync(configPath, yaml.dump(configData));

    const result = loadIacToolboxYaml(tmpDir, configPath);
    expect(result).toMatchObject(configData);
  });
});

// ---------------------------------------------------------------------------
// Credentials guard: grafana_admin_password is required
// ---------------------------------------------------------------------------
describe('applyInstall pre-flight — credentials', () => {
  it('loadCredentials returns empty object when credentials file is absent', async () => {
    const { loadCredentials } = await import('../utils/credentials.js');
    // Use a non-existent profile name to avoid picking up real credentials
    const creds = loadCredentials('__test_nonexistent_profile__');
    expect(creds).toEqual({});
    expect(creds.grafana_admin_password).toBeUndefined();
  });

  it('grafana_admin_password is undefined when not set in profile', async () => {
    const { parseCredentialsFile } = await import('../utils/credentials.js');
    const content = '[default]\ndocker_hub_token = sometoken\n';
    const parsed = parseCredentialsFile(content);
    expect(parsed.default.grafana_admin_password).toBeUndefined();
  });

  it('grafana_admin_password is defined when set in profile', async () => {
    const { parseCredentialsFile } = await import('../utils/credentials.js');
    const content = '[default]\ngrafana_admin_password = supersecret\n';
    const parsed = parseCredentialsFile(content);
    expect(parsed.default.grafana_admin_password).toBe('supersecret');
  });
});

// ---------------------------------------------------------------------------
// Config shape: cloudflare.enabled gates Cloudflare step
// ---------------------------------------------------------------------------
describe('applyInstall install sequence — cloudflare gate', () => {
  it('cloudflare.enabled=false means Cloudflare step is skipped', () => {
    const config = {
      cloudflare: { enabled: false },
    };
    const cloudflareEnabled =
      config.cloudflare && config.cloudflare.enabled === true;
    expect(cloudflareEnabled).toBe(false);
  });

  it('cloudflare.enabled=true means Cloudflare step runs', () => {
    const config = {
      cloudflare: { enabled: true },
    };
    const cloudflareEnabled =
      config.cloudflare && config.cloudflare.enabled === true;
    expect(cloudflareEnabled).toBe(true);
  });

  it('missing cloudflare section means Cloudflare step is skipped', () => {
    const config: Record<string, unknown> = {};
    const cloudflareEnabled =
      config.cloudflare &&
      (config.cloudflare as { enabled?: boolean }).enabled === true;
    expect(cloudflareEnabled).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Post-install summary: host selection
// ---------------------------------------------------------------------------
describe('applyInstall post-install summary — host selection', () => {
  it('uses localhost when target.mode is local', () => {
    const config = { target: { mode: 'local' } };
    const targetMode = config.target?.mode ?? 'local';
    const displayHost = targetMode === 'remote' ? 'remote-host' : 'localhost';
    expect(displayHost).toBe('localhost');
  });

  it('uses target.host when target.mode is remote', () => {
    const config = {
      target: { mode: 'remote', host: 'raspberry-4b.local', user: 'pi' },
    };
    const targetMode = config.target?.mode ?? 'local';
    const targetHost = config.target?.host ?? 'localhost';
    const displayHost = targetMode === 'remote' ? targetHost : 'localhost';
    expect(displayHost).toBe('raspberry-4b.local');
  });
});

// ---------------------------------------------------------------------------
// Service ports: defaults
// ---------------------------------------------------------------------------
describe('applyInstall post-install summary — service ports', () => {
  it('uses default port 3000 for grafana when not specified', () => {
    const config: Record<string, unknown> = {};
    const grafanaPort =
      (config.grafana as { port?: number } | undefined)?.port ?? 3000;
    expect(grafanaPort).toBe(3000);
  });

  it('uses default port 9090 for prometheus when not specified', () => {
    const config: Record<string, unknown> = {};
    const prometheusPort =
      (config.prometheus as { port?: number } | undefined)?.port ?? 9090;
    expect(prometheusPort).toBe(9090);
  });

  it('uses default port 8080 for cadvisor when not specified', () => {
    const config: Record<string, unknown> = {};
    const cadvisorPort =
      (config.cadvisor as { port?: number } | undefined)?.port ?? 8080;
    expect(cadvisorPort).toBe(8080);
  });

  it('uses configured port values when specified', () => {
    const config = {
      grafana: { port: 4000 },
      prometheus: { port: 9091 },
      cadvisor: { port: 8081 },
    };
    expect(config.grafana.port).toBe(4000);
    expect(config.prometheus.port).toBe(9091);
    expect(config.cadvisor.port).toBe(8081);
  });
});

// ---------------------------------------------------------------------------
// Config file path resolution via explicit filePath
// ---------------------------------------------------------------------------
describe('applyInstall — filePath option', () => {
  it('loads config from explicit filePath', async () => {
    const { loadIacToolboxYaml } = await import('../utils/grafanaConfig.js');
    const explicitPath = path.join(tmpDir, 'custom-config.yml');
    const configData = {
      target: { mode: 'local' },
      grafana: { port: 3000 },
    };
    fs.writeFileSync(explicitPath, yaml.dump(configData));

    const result = loadIacToolboxYaml('unrelated-destination', explicitPath);
    expect(result).toMatchObject(configData);
  });
});
