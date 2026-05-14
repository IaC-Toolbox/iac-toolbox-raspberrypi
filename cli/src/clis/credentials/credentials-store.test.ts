import { describe, it, expect } from '@jest/globals';
import {
  parseCredentialsFile,
  serializeCredentialsFile,
} from '../../loaders/credentials-loader.js';

describe('parseCredentialsFile', () => {
  it('parses empty file', () => {
    const result = parseCredentialsFile('');
    expect(result).toEqual({});
  });

  it('parses single profile with credentials', () => {
    const content =
      '[default]\ngithub_pat = ghp_test\ndocker_hub_token = dckr_test\n';
    const result = parseCredentialsFile(content);

    expect(result.default).toBeDefined();
    expect(result.default.github_pat).toBe('ghp_test');
    expect(result.default.docker_hub_token).toBe('dckr_test');
  });

  it('parses multiple profiles', () => {
    const content =
      '[default]\ngithub_pat = token1\n\n[production]\ngithub_pat = token2\n';
    const result = parseCredentialsFile(content);

    expect(result.default.github_pat).toBe('token1');
    expect(result.production.github_pat).toBe('token2');
  });

  it('ignores comments and empty lines', () => {
    const content =
      '# Comment\n[default]\n; Another comment\n\ngithub_pat = token\n';
    const result = parseCredentialsFile(content);

    expect(result.default.github_pat).toBe('token');
  });

  it('handles values with equals signs', () => {
    const content = '[default]\nkey = value=with=equals\n';
    const result = parseCredentialsFile(content);

    expect(result.default.key).toBe('value=with=equals');
  });
});

describe('serializeCredentialsFile', () => {
  it('serializes empty object', () => {
    const result = serializeCredentialsFile({});
    expect(result).toBe('\n'); // Empty sections array joins to empty then adds newline
  });

  it('serializes single profile', () => {
    const data = {
      default: {
        github_pat: 'token1',
        docker_hub_token: 'token2',
      },
    };
    const result = serializeCredentialsFile(data);

    expect(result).toContain('[default]');
    expect(result).toContain('github_pat = token1');
    expect(result).toContain('docker_hub_token = token2');
  });

  it('serializes multiple profiles', () => {
    const data = {
      default: { github_pat: 'token1' },
      production: { github_pat: 'token2' },
    };
    const result = serializeCredentialsFile(data);

    expect(result).toContain('[default]');
    expect(result).toContain('[production]');
    expect(result).toContain('github_pat = token1');
    expect(result).toContain('github_pat = token2');
  });

  it('round-trips correctly', () => {
    const original = {
      default: { github_pat: 'token1', docker_hub_token: 'token2' },
      prod: { github_pat: 'token3' },
    };
    const serialized = serializeCredentialsFile(original);
    const parsed = parseCredentialsFile(serialized);

    expect(parsed).toEqual(original);
  });
});
