import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import MetricsAgentInitWizard from './metrics-agent-init-wizard.js';

/**
 * MetricsAgentInitWizard tests.
 *
 * The wizard no longer prompts for input — it immediately calls updateMetricsAgentConfig
 * on mount and shows a success screen. The _updateMetricsAgentConfig prop is injectable
 * for testing.
 */

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MetricsAgentInitWizard', () => {
  it('renders the success screen immediately', async () => {
    const { lastFrame } = render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _updateMetricsAgentConfig={() => {}}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    const output = lastFrame() ?? '';
    expect(output).toContain('Metrics agent configuration saved');
    expect(output).toContain('iac-toolbox metrics-agent install');
  });

  it('does not prompt for a remote_write URL', () => {
    const { lastFrame } = render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _updateMetricsAgentConfig={() => {}}
      />
    );

    const output = lastFrame() ?? '';
    // The prompt text "metrics will be pushed here" should not appear (it was from the old URL prompt)
    expect(output).not.toContain('metrics will be pushed here');
    expect(output).not.toContain('URL must not be empty');
    expect(output).not.toContain('http:// or https://');
  });

  it('shows that remote_write URL is derived at Ansible play time', async () => {
    const { lastFrame } = render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _updateMetricsAgentConfig={() => {}}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    const output = lastFrame() ?? '';
    expect(output).toContain('prometheus.domain');
  });

  it('calls _updateMetricsAgentConfig with destination and filePath on mount', async () => {
    const updateConfig = jest.fn();
    render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        filePath="/tmp/dest/iac-toolbox.yml"
        _updateMetricsAgentConfig={updateConfig}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      '/tmp/dest/iac-toolbox.yml'
    );
  });

  it('calls onComplete after a short delay', async () => {
    const onComplete = jest.fn();
    render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        onComplete={onComplete}
        _updateMetricsAgentConfig={() => {}}
      />
    );

    await new Promise((r) => setTimeout(r, 250));

    expect(onComplete).toHaveBeenCalled();
  });
});
