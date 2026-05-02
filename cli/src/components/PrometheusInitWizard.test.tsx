import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import PrometheusInitWizard from './PrometheusInitWizard.js';

/**
 * PrometheusInitWizard tests.
 *
 * Uses injectable _TextInput, _loadGrafanaUrl, and _updatePrometheusConfig
 * props to avoid filesystem and TTY dependencies.
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
  it('renders the Grafana URL prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Prometheus Setup');
    expect(output).toContain('Grafana URL');
  });

  it('shows error when empty URL is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('URL must not be empty');
  });

  it('shows error when URL does not start with http:// or https://', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    helper.submit('ftp://localhost:3000');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('URL must start with http:// or https://');
  });

  it('shows done screen and calls update config on valid URL', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={updateConfig}
      />
    );

    helper.submit('http://localhost:3000');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Prometheus configuration saved');
    expect(frame).toContain('iac-toolbox prometheus install');
    expect(frame).toContain('http://localhost:3000');

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      'http://localhost:3000'
    );
  });

  it('accepts https URLs', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={updateConfig}
      />
    );

    helper.submit('https://grafana.example.com');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Prometheus configuration saved');
    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      'https://grafana.example.com'
    );
  });

  it('pre-fills URL from existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadGrafanaUrl={() => 'http://custom-grafana:4000'}
        _updatePrometheusConfig={() => {}}
      />
    );

    expect(capturedValue).toBe('http://custom-grafana:4000');
  });

  it('uses default URL when no existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={() => {}}
      />
    );

    expect(capturedValue).toBe('http://localhost:3000');
  });

  it('trims whitespace from submitted URL', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <PrometheusInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadGrafanaUrl={() => undefined}
        _updatePrometheusConfig={updateConfig}
      />
    );

    helper.submit('  http://localhost:3000  ');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Prometheus configuration saved');
    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      'http://localhost:3000'
    );
  });
});
