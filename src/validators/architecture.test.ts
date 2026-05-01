import { describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import os from 'os';
import { validateArchitecture } from './architecture.js';

describe('validateArchitecture', () => {
  let originalArch: typeof os.arch;
  let originalPlatform: typeof os.platform;

  beforeEach(() => {
    originalArch = os.arch;
    originalPlatform = os.platform;
  });

  afterEach(() => {
    os.arch = originalArch;
    os.platform = originalPlatform;
  });

  it('validates arm64 architecture as supported', () => {
    os.arch = () => 'arm64';
    os.platform = () => 'linux';

    const result = validateArchitecture();

    expect(result.isSupported).toBe(true);
    expect(result.arch).toBe('arm64');
    expect(result.platform).toBe('linux');
    expect(result.warning).toBeUndefined();
  });

  it('validates aarch64 architecture as supported', () => {
    os.arch = () => 'aarch64';
    os.platform = () => 'linux';

    const result = validateArchitecture();

    expect(result.isSupported).toBe(true);
    expect(result.arch).toBe('aarch64');
    expect(result.warning).toBeUndefined();
  });

  it('warns on x64 architecture but marks as supported', () => {
    os.arch = () => 'x64';
    os.platform = () => 'darwin';

    const result = validateArchitecture();

    expect(result.isSupported).toBe(false);
    expect(result.arch).toBe('x64');
    expect(result.platform).toBe('darwin');
    expect(result.warning).toContain('optimized for ARM64/Raspberry Pi');
    expect(result.warning).toContain('x64 on darwin');
  });

  it('warns on x86 architecture', () => {
    os.arch = () => 'x86';
    os.platform = () => 'linux';

    const result = validateArchitecture();

    expect(result.isSupported).toBe(false);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('x86 on linux');
  });
});
