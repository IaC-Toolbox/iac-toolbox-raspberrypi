import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { validateToken } from './cloudflare-config-dialog.js';

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('validateToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valid when response is 200 with success: true', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    const result = await validateToken('valid-token');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('Token verified');
  });

  it('returns valid when response is 200 with missing success field', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const result = await validateToken('valid-token');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('Token verified');
  });

  it('returns invalid when response is 401', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    } as Response);

    const result = await validateToken('invalid-token');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('401');
  });
});
