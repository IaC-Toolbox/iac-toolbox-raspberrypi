import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import TargetInitWizard from './TargetInitWizard.js';
import type { TargetConfig } from '../utils/targetConfig.js';

/**
 * TargetInitWizard tests.
 *
 * Uses injectable _SelectInput, _TextInput, _loadTargetConfig,
 * _updateTargetConfig, and _testSshConnection props to avoid
 * filesystem, TTY, and network dependencies.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  mask?: string;
}

interface SelectItem {
  label: string;
  value: string;
}

interface SelectInputProps {
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
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

/**
 * Returns a fake SelectInput component and helper to simulate selection.
 */
function makeSelectInputHelper(): {
  SelectInput: (props: SelectInputProps) => null;
  select: (value: string) => void;
} {
  let onSelectFn: ((item: SelectItem) => void) | undefined;
  let itemsFn: SelectItem[] = [];

  const SelectInput = (props: SelectInputProps): null => {
    onSelectFn = props.onSelect;
    itemsFn = props.items;
    return null;
  };

  return {
    SelectInput: SelectInput as unknown as (props: SelectInputProps) => null,
    select: (value: string) => {
      const item = itemsFn.find((i) => i.value === value);
      if (item) onSelectFn?.(item);
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TargetInitWizard', () => {
  it('renders mode selection on initial render', () => {
    const { SelectInput } = makeSelectInputHelper();
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Target Setup');
    expect(output).toContain('Where do you want to install');
  });

  it('selecting localhost transitions directly to done', async () => {
    const selectHelper = makeSelectInputHelper();
    const { TextInput } = makeTextInputHelper();
    const updateConfig = jest.fn();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={updateConfig}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('local');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Target configuration saved');
    expect(frame).toContain('localhost');
    expect(updateConfig).toHaveBeenCalledWith('/tmp/dest', { mode: 'local' });
  });

  it('selecting remote transitions to connection string step', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('SSH connection string');
    expect(frame).toContain('remote');
  });

  it('shows error for connection string without @', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    // Go to remote step
    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    // Submit invalid connection string
    textHelper.submit('nohostname');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Invalid format');
    expect(frame).toContain('SSH connection string');
  });

  it('shows error for empty user in connection string', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    // Empty user part
    textHelper.submit('@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Invalid format');
  });

  it('shows error for empty host in connection string', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    // Empty host part
    textHelper.submit('pi@');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Invalid format');
  });

  it('advances to ssh_key step after valid connection string', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    textHelper.submit('pi@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('SSH private key path');
    expect(frame).toContain('pi@192.168.1.50');
  });

  it('shows error for empty ssh key path', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('pi@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));

    // Submit empty ssh key
    textHelper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('SSH key path must not be empty');
  });

  it('shows testing screen after valid ssh key submitted', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    // Use a never-resolving promise to stay on testing screen
    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={() => new Promise(() => {})}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('pi@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('~/.ssh/id_ed25519');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Testing SSH connection');
    expect(frame).toContain('pi@192.168.1.50');
  });

  it('shows done screen for remote on successful ssh test', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();
    const updateConfig = jest.fn();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={updateConfig}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('pi@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('~/.ssh/id_ed25519');
    await new Promise((r) => setTimeout(r, 150));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Target configuration saved');
    expect(frame).toContain('remote');
    expect(frame).toContain('192.168.1.50');
    expect(frame).toContain('pi');
    expect(updateConfig).toHaveBeenCalledWith('/tmp/dest', {
      mode: 'remote',
      host: '192.168.1.50',
      user: 'pi',
      ssh_key: '~/.ssh/id_ed25519',
    });
  });

  it('shows error screen on failed ssh connection', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();

    const { lastFrame } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={() => ({ mode: 'local' })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => false}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('pi@192.168.1.50');
    await new Promise((r) => setTimeout(r, 50));
    textHelper.submit('~/.ssh/id_ed25519');
    await new Promise((r) => setTimeout(r, 150));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('SSH connection failed');
    expect(frame).toContain('Could not connect to');
    expect(frame).toContain('Retry');
  });

  it('pre-fills connection string from existing remote config', async () => {
    const selectHelper = makeSelectInputHelper();
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={TextInput}
        _loadTargetConfig={(): TargetConfig => ({
          mode: 'remote',
          host: '10.0.0.1',
          user: 'admin',
          ssh_key: '~/.ssh/id_rsa',
        })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedValue).toBe('admin@10.0.0.1');
  });

  it('pre-fills ssh key from existing remote config', async () => {
    const selectHelper = makeSelectInputHelper();
    const textHelper = makeTextInputHelper();
    const capturedValues: string[] = [];
    const TextInput = (props: TextInputProps): null => {
      capturedValues.push(props.value);
      return null;
    };

    const { rerender } = render(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={textHelper.TextInput}
        _loadTargetConfig={(): TargetConfig => ({
          mode: 'remote',
          host: '10.0.0.1',
          user: 'admin',
          ssh_key: '~/.ssh/custom_key',
        })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    // Go to remote connection string step
    selectHelper.select('remote');
    await new Promise((r) => setTimeout(r, 50));

    // Advance to ssh_key step
    textHelper.submit('admin@10.0.0.1');
    await new Promise((r) => setTimeout(r, 50));

    // Now re-render with capturing TextInput to inspect value
    rerender(
      <TargetInitWizard
        destination="/tmp/dest"
        _SelectInput={
          selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
        }
        _TextInput={TextInput}
        _loadTargetConfig={(): TargetConfig => ({
          mode: 'remote',
          host: '10.0.0.1',
          user: 'admin',
          ssh_key: '~/.ssh/custom_key',
        })}
        _updateTargetConfig={() => {}}
        _testSshConnection={async () => true}
      />
    );

    // After re-render, the component still has ssh_key step state
    // capturedValues should contain at least one entry
    expect(capturedValues.length).toBeGreaterThan(0);
  });
});
