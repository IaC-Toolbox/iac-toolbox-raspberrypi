import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { validateCredential, hasValidator } from './credential-validators.js';

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('credentialValidators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCredential', () => {
    it('returns invalid for empty value', async () => {
      const result = await validateCredential('github_pat', '');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('validates GitHub PAT successfully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      } as Response);

      const result = await validateCredential('github_pat', 'ghp_test');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('testuser');
    });

    it('handles GitHub API failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const result = await validateCredential('github_pat', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('401');
    });

    it('validates Cloudflare token successfully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await validateCredential(
        'cloudflare_tunnel_token',
        'cf_token'
      );
      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('validates Cloudflare token when success field is missing in 200 response', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const result = await validateCredential(
        'cloudflare_tunnel_token',
        'cf_token'
      );
      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('rejects Cloudflare token on 401 response', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const result = await validateCredential(
        'cloudflare_tunnel_token',
        'cf_token'
      );
      expect(result.valid).toBe(false);
      expect(result.message).toContain('401');
    });

    it('handles network error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await validateCredential('github_pat', 'token');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Network error');
    });
  });

  describe('hasValidator', () => {
    it('returns true for known credential keys', () => {
      expect(hasValidator('github_pat')).toBe(true);
      expect(hasValidator('docker_hub_token')).toBe(true);
      expect(hasValidator('cloudflare_tunnel_token')).toBe(true);
    });

    it('returns false for unknown keys', () => {
      expect(hasValidator('unknown_key')).toBe(false);
      expect(hasValidator('')).toBe(false);
    });
  });
});
