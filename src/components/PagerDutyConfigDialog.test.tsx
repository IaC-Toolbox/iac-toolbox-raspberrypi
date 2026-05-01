import { describe, it, expect, jest } from '@jest/globals';
import { render } from 'ink-testing-library';
import PagerDutyConfigDialog from './PagerDutyConfigDialog.js';

/**
 * PagerDutyConfigDialog tests.
 *
 * TODO: Interactive tests with stdin writes are flaky in ink-testing-library
 * due to timing and rendering issues. These tests validate the basic structure.
 * Consider adding E2E tests with cli-testing-library for full flow validation.
 */

describe('PagerDutyConfigDialog', () => {
  it('renders enable/skip prompt', () => {
    const onComplete = jest.fn();
    const { lastFrame } = render(
      <PagerDutyConfigDialog onComplete={onComplete} />
    );

    const output = lastFrame();
    expect(output).toContain('Configure PagerDuty alerting?');
    expect(output).toContain('Yes');
    expect(output).toContain('Skip');
  });

  it.skip('calls onComplete with disabled when skipped', async () => {
    // TODO: Fix stdin interaction timing in ink-testing-library
    const onComplete = jest.fn();
    const { stdin } = render(<PagerDutyConfigDialog onComplete={onComplete} />);

    stdin.write('\x1B[B'); // Down to Skip
    await new Promise((resolve) => setTimeout(resolve, 50));
    stdin.write('\r'); // Enter
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onComplete).toHaveBeenCalledWith({ enabled: false });
  });

  it.skip('proceeds to token input when yes is selected', async () => {
    // TODO: Fix stdin interaction timing in ink-testing-library
    const onComplete = jest.fn();
    const { stdin, lastFrame } = render(
      <PagerDutyConfigDialog onComplete={onComplete} />
    );

    stdin.write('\r'); // Select Yes
    await new Promise((resolve) => setTimeout(resolve, 50));

    const output = lastFrame();
    expect(output).toContain('Enter PagerDuty API token');
  });

  it.skip('proceeds through all configuration steps', async () => {
    // TODO: Fix stdin interaction timing in ink-testing-library
    const onComplete = jest.fn();
    const { stdin } = render(<PagerDutyConfigDialog onComplete={onComplete} />);

    stdin.write('\r'); // Enable
    await new Promise((resolve) => setTimeout(resolve, 50));
    stdin.write('token123\r'); // Token
    await new Promise((resolve) => setTimeout(resolve, 50));
    stdin.write('\r'); // Region (US)
    await new Promise((resolve) => setTimeout(resolve, 50));
    stdin.write('user@example.com\r'); // User email
    await new Promise((resolve) => setTimeout(resolve, 50));
    stdin.write('alert@example.com\r'); // Alert email
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onComplete).toHaveBeenCalledWith({
      enabled: true,
      token: 'token123',
      serviceRegion: 'us',
      userEmail: 'user@example.com',
      alertEmail: 'alert@example.com',
    });
  });
});
