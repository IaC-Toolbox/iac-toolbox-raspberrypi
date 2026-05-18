import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import MetricsAgentInitWizard from './metrics-agent-init-wizard.js';

/**
 * MetricsAgentInitWizard tests.
 *
 * Uses injectable _TextInput prop to avoid TTY dependencies.
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

describe('MetricsAgentInitWizard', () => {
  it('renders the remote_write URL prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <MetricsAgentInitWizard destination="/tmp/dest" _TextInput={TextInput} />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Metrics Agent Setup');
    expect(output).toContain('remote_write URL');
  });

  it('pre-fills URL with the default remote_write URL', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <MetricsAgentInitWizard destination="/tmp/dest" _TextInput={TextInput} />
    );

    // Default value is the hardcoded fallback when no config file exists
    expect(capturedValue).toContain('prometheus/api/v1/write');
  });

  it('shows error when empty URL is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
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
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
      />
    );

    helper.submit('ftp://remote-write.example.com/api/v1/write');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('URL must start with http:// or https://');
  });

  it('shows done screen on valid URL submit', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <MetricsAgentInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
      />
    );

    helper.submit('https://grafana.iac-toolbox.com/prometheus/api/v1/write');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Metrics agent configuration saved');
    expect(frame).toContain('iac-toolbox metrics-agent install');
    expect(frame).toContain(
      'https://grafana.iac-toolbox.com/prometheus/api/v1/write'
    );
  });
});
