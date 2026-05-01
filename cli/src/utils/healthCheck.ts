/**
 * Poll a URL until it returns a 200 status code or retries are exhausted.
 */
export async function pollHealth(
  url: string,
  options: { retries: number; delayMs: number }
): Promise<boolean> {
  const { retries, delayMs } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Connection refused or timeout — keep retrying
    }

    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}
