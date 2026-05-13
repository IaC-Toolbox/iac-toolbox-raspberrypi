import { spawnSync } from 'child_process';

/**
 * Test SSH connectivity to a remote host.
 * Returns true if the connection succeeds.
 */
export async function testSshConnection(
  host: string,
  user: string,
  sshKey: string
): Promise<boolean> {
  const result = spawnSync(
    'ssh',
    [
      '-i',
      sshKey,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      `${user}@${host}`,
      'echo ok',
    ],
    { encoding: 'utf-8' }
  );
  return result.status === 0;
}

/**
 * Check whether Docker is available on the target.
 *
 * For remote targets, runs `docker info` over SSH.
 * For localhost, runs `docker info` directly.
 */
export function checkDockerAvailable(
  mode: string,
  host?: string,
  user?: string,
  sshKey?: string
): boolean {
  if (mode === 'remote' && host && user && sshKey) {
    const result = spawnSync(
      'ssh',
      [
        '-i',
        sshKey,
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        '-o',
        'ConnectTimeout=10',
        '-o',
        'BatchMode=yes',
        `${user}@${host}`,
        'docker info > /dev/null 2>&1',
      ],
      { encoding: 'utf-8' }
    );
    return result.status === 0;
  }

  // local mode
  const result = spawnSync('docker', ['info'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  return result.status === 0;
}
