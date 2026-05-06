import { spawnSync } from 'child_process';

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

/**
 * Poll a Docker container's running state until it is true or retries are exhausted.
 * Use this instead of pollHealth when the container's port is not accessible from
 * the host (e.g. Rancher Desktop on macOS).
 */
export async function pollDockerHealth(
  containerName: string,
  options: { retries: number; delayMs: number }
): Promise<boolean> {
  const { retries, delayMs } = options;

  for (let i = 0; i < retries; i++) {
    const result = spawnSync(
      'docker',
      ['inspect', '--format={{.State.Running}}', containerName],
      { encoding: 'utf8' }
    );

    if (result.status === 0 && result.stdout.trim() === 'true') {
      return true;
    }

    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}
