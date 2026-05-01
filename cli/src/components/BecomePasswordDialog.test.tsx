import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import BecomePasswordDialog from './BecomePasswordDialog.js';

/**
 * BecomePasswordDialog tests.
 *
 * Uses an injectable _TextInput prop to avoid stdin.ref issues in
 * ink-testing-library (the real ink-text-input uses useInput which requires
 * a real TTY stdin). This mirrors the _runInstallScript pattern in
 * InstallRunnerDialog.
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
 * Captures the latest props so tests can trigger onChange/onSubmit directly.
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

describe('BecomePasswordDialog', () => {
  it('renders the sudo password prompt labels', () => {
    const { TextInput } = makeTextInputHelper();
    const onComplete = jest.fn();
    const { lastFrame } = render(
      <BecomePasswordDialog onComplete={onComplete} _TextInput={TextInput} />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('Sudo password required');
    expect(output).toContain('Ansible needs your sudo password');
    expect(output).toContain('It will not be stored anywhere');
    expect(output).toContain('Password:');
  });

  it('shows inline error and does not call onComplete on empty submit', async () => {
    const helper = makeTextInputHelper();
    const onComplete = jest.fn();
    const { lastFrame } = render(
      <BecomePasswordDialog
        onComplete={onComplete}
        _TextInput={helper.TextInput}
      />
    );

    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).not.toHaveBeenCalled();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Password cannot be empty');
  });

  it('shows inline error and does not call onComplete on whitespace-only submit', async () => {
    const helper = makeTextInputHelper();
    const onComplete = jest.fn();
    const { lastFrame } = render(
      <BecomePasswordDialog
        onComplete={onComplete}
        _TextInput={helper.TextInput}
      />
    );

    helper.submit('   ');
    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).not.toHaveBeenCalled();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Password cannot be empty');
  });

  it('calls onComplete with the password value on valid submit', async () => {
    const helper = makeTextInputHelper();
    const onComplete = jest.fn<(password: string) => void>();
    render(
      <BecomePasswordDialog
        onComplete={onComplete}
        _TextInput={helper.TextInput}
      />
    );

    helper.type('mysecretpassword');
    await new Promise((r) => setTimeout(r, 20));
    helper.submit('mysecretpassword');
    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).toHaveBeenCalledWith('mysecretpassword');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not show error on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const onComplete = jest.fn();
    const { lastFrame } = render(
      <BecomePasswordDialog onComplete={onComplete} _TextInput={TextInput} />
    );

    const output = lastFrame() ?? '';
    expect(output).not.toContain('Password cannot be empty');
  });
});
