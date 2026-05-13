import { describe, it, expect } from '@jest/globals';
import { resolveConfigTemplates } from './configResolver.js';

describe('resolveConfigTemplates', () => {
  it('resolves a single template variable', () => {
    const yaml = 'admin_password: {{ grafana_admin_password }}';
    const creds = { grafana_admin_password: 'secret123' };
    const { resolved, missing } = resolveConfigTemplates(yaml, creds);

    expect(missing).toHaveLength(0);
    expect(resolved).toBe('admin_password: secret123');
  });

  it('resolves multiple template variables', () => {
    const yaml = [
      'grafana:',
      '  admin_password: {{ grafana_admin_password }}',
      'cloudflare:',
      '  api_token: {{ cloudflare_api_token }}',
    ].join('\n');
    const creds = {
      grafana_admin_password: 'grafana-secret',
      cloudflare_api_token: 'cf-token-abc',
    };
    const { resolved, missing } = resolveConfigTemplates(yaml, creds);

    expect(missing).toHaveLength(0);
    expect(resolved).toContain('admin_password: grafana-secret');
    expect(resolved).toContain('api_token: cf-token-abc');
  });

  it('returns missing list when a variable is not in credentials', () => {
    const yaml = 'token: {{ missing_var }}';
    const { resolved, missing } = resolveConfigTemplates(yaml, {});

    expect(missing).toEqual(['missing_var']);
    expect(resolved).toBe('');
  });

  it('leaves ansible_* variables untouched even when not in credentials', () => {
    const yaml = 'home: {{ ansible_env.HOME }}';
    const { resolved, missing } = resolveConfigTemplates(yaml, {});

    expect(missing).toHaveLength(0);
    expect(resolved).toBe('home: {{ ansible_env.HOME }}');
  });

  it('leaves ansible_* variables untouched even when present in credentials', () => {
    const yaml = 'home: {{ ansible_env.HOME }}';
    const creds = { 'ansible_env.HOME': '/home/pi' };
    const { resolved, missing } = resolveConfigTemplates(yaml, creds);

    expect(missing).toHaveLength(0);
    expect(resolved).toBe('home: {{ ansible_env.HOME }}');
  });

  it('reports only non-ansible missing vars in a mixed YAML', () => {
    const yaml = [
      'password: {{ grafana_admin_password }}',
      'facts: {{ ansible_facts }}',
      'token: {{ missing_secret }}',
    ].join('\n');
    const creds = { grafana_admin_password: 'pw' };
    const { resolved, missing } = resolveConfigTemplates(yaml, creds);

    expect(missing).toContain('missing_secret');
    expect(missing).not.toContain('ansible_facts');
    expect(resolved).toBe('');
  });

  it('handles whitespace around variable name in template', () => {
    const yaml = 'key: {{  grafana_admin_password  }}';
    const creds = { grafana_admin_password: 'value' };
    const { resolved, missing } = resolveConfigTemplates(yaml, creds);

    expect(missing).toHaveLength(0);
    expect(resolved).toBe('key: value');
  });

  it('deduplicates missing variable names', () => {
    const yaml = 'a: {{ missing_var }}\nb: {{ missing_var }}';
    const { missing } = resolveConfigTemplates(yaml, {});

    expect(missing).toEqual(['missing_var']);
  });

  it('returns resolved YAML unchanged when no templates are present', () => {
    const yaml = 'grafana:\n  enabled: true\n  port: 3000';
    const { resolved, missing } = resolveConfigTemplates(yaml, {});

    expect(missing).toHaveLength(0);
    expect(resolved).toBe(yaml);
  });
});
