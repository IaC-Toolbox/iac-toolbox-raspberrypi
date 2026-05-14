import { describe, it, expect } from '@jest/globals';
import {
  detectAnsible,
  detectTerraform,
  isBrewAvailable,
} from './baseline_checks.js';

/**
 * Prerequisites detection tests.
 *
 * TODO: These tests currently run against the real system because ESM mocking
 * with Jest is complex for promisify wrappers. Consider refactoring to use
 * dependency injection or switching to a test runner with better ESM support.
 *
 * For now, these tests validate the actual system state.
 */

describe('detectAnsible', () => {
  it('returns valid structure', async () => {
    const result = await detectAnsible();

    expect(result).toHaveProperty('isInstalled');
    expect(result).toHaveProperty('version');
    expect(typeof result.isInstalled).toBe('boolean');

    if (result.isInstalled) {
      expect(typeof result.version).toBe('string');
    } else {
      expect(result.version).toBeNull();
    }
  });
});

describe('detectTerraform', () => {
  it('returns valid structure', async () => {
    const result = await detectTerraform();

    expect(result).toHaveProperty('isInstalled');
    expect(result).toHaveProperty('version');
    expect(typeof result.isInstalled).toBe('boolean');

    if (result.isInstalled) {
      expect(typeof result.version).toBe('string');
    } else {
      expect(result.version).toBeNull();
    }
  });
});

describe('isBrewAvailable', () => {
  it('returns boolean', async () => {
    const result = await isBrewAvailable();

    expect(typeof result).toBe('boolean');
  });
});
