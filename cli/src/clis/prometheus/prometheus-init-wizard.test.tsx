import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import PrometheusInitWizard from './prometheus-init-wizard.js';

/**
 * PrometheusInitWizard tests.
 *
 * Uses injectable _TextInput, _loadDomain, and _updatePrometheusConfig
 * props to avoid filesystem and TTY dependencies.
 *
 * The wizard now has a single step: enter the Prometheus public domain.
 * grafana_url is no longer prompted — it is derived by Ansible from grafana.domain.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

/**
 * Returns a fake TextInput component and helpers to simulate typing/submitting.
 */
function makeTextInputHelper(): {
  TextInput: (props: TextInputProps) => null;
  type: (value: string) => void;
  submit: (value: string) => void;
} {
  let onChangeFn: ((value: string) => void) | undefined;
  let onSubmitFn: ((value: string) => void) | undefined;

  const TextInput = (props: TextInputProps): null => {
    onChangeFn = props.onChange;
    onSubmitFn = props.onSubmit;
    return null;
  };

  return {
    TextInput,
    type: (value) => onChangeFn?.(value),
    submit: (value) => onSubmitFn?.(value),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PrometheusInitWizard', () => {
  it('renders the domain prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Prometheus Setup');
    expect(output).toContain('Prometheus public domain');
  });

  it('does not show Grafana URL prompt', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).not.toContain('Grafana URL');
  });

  it('shows error when empty domain is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Domain must not be empty');
  });

  it('shows done screen and calls update config after domain submit', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={updateConfig}
      />
    );

    helper.submit('prometheus.iac-toolbox.com');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Prometheus configuration saved');
    expect(frame).toContain('iac-toolbox prometheus install');
    expect(frame).toContain('prometheus.iac-toolbox.com');

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      'prometheus.iac-toolbox.com',
      undefined
    );
  });

  it('pre-fills domain from existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadDomain={() => 'prometheus.my-domain.com'}
        _updatePrometheusConfig={() => {}}
      />
    );

    expect(capturedValue).toBe('prometheus.my-domain.com');
  });

  it('uses default domain when no existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    expect(capturedValue).toBe('prometheus.iac-toolbox.com');
  });

  it('trims whitespace from submitted domain', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadDomain={() => undefined}
        _updatePrometheusConfig={updateConfig}
      />
    );

    helper.submit('  prometheus.iac-toolbox.com  ');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Prometheus configuration saved');
    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      'prometheus.iac-toolbox.com',
      undefined
    );
  });
});
