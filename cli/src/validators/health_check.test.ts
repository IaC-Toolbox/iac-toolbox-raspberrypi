import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { pollHealth } from './health_check.js';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('pollHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the endpoint responds with 200 on the first try', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 3,
      delayMs: 10,
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns true after retrying on initial failures', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 5,
      delayMs: 10,
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns false when all retries are exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 3,
      delayMs: 10,
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns false when endpoint returns non-OK status for all retries', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 2,
      delayMs: 10,
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on non-OK responses then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 3,
      delayMs: 10,
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles a single retry correctly', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    const result = await pollHealth('http://localhost:3000/api/health', {
      retries: 1,
      delayMs: 10,
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
