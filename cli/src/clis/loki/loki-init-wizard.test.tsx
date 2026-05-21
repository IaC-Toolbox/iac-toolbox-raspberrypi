import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import LokiInitWizard from './loki-init-wizard.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

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

describe('LokiInitWizard', () => {
  it('renders the port prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Loki Setup');
    expect(output).toContain('Loki HTTP port');
  });

  it('shows error when empty port is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame() ?? '').toContain('Port must be a number');
  });

  it('shows error when port is not an integer', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    helper.submit('abc');
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame() ?? '').toContain('Port must be a number');
  });

  it('shows error when port is out of range', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    helper.submit('99999');
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame() ?? '').toContain('Port must be between 1 and 65535');
  });

  it('advances to retention prompt after valid port', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    helper.submit('3100');
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame() ?? '').toContain('Log retention (hours)');
    expect(lastFrame() ?? '').toContain('Port: 3100');
  });

  it('shows error when retention is not a positive integer', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    helper.submit('3100');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('0');
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame() ?? '').toContain(
      'Retention must be a positive number of hours'
    );
  });

  it('shows done screen and calls updateLokiConfig after both steps', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={updateConfig}
      />
    );
    helper.submit('3100');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('168');
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Loki configuration saved');
    expect(frame).toContain('iac-toolbox loki install');
    expect(frame).toContain('3100');
    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      3100,
      168,
      undefined
    );
  });

  it('pre-fills port from existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };
    render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadLokiPort={() => 9000}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    expect(capturedValue).toBe('9000');
  });

  it('uses default port when no existing config', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };
    render(
      <LokiInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadLokiPort={() => undefined}
        _loadLokiRetentionHours={() => undefined}
        _updateLokiConfig={() => {}}
      />
    );
    expect(capturedValue).toBe('3100');
  });
});
