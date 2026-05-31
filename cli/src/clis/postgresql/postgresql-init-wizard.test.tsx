import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import PostgresqlInitWizard from './postgresql-init-wizard.js';
import type { PostgresqlConfig } from './postgresql-config.js';

/**
 * PostgresqlInitWizard tests.
 *
 * Uses injectable _TextInput, _loadPostgresqlConfig, _loadPostgresPassword,
 * and _updatePostgresqlConfig props to avoid filesystem and TTY dependencies.
 * Follows the pattern used in GrafanaInitWizard.test.tsx and LokiInitWizard.test.tsx.
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

const defaultConfig: PostgresqlConfig = {
  enabled: true,
  port: 5432,
  database: 'postgres',
  version: '16',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostgresqlInitWizard', () => {
  it('renders the password prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('PostgreSQL');
    expect(output).toContain('Admin password');
  });

  it('shows error when empty password is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Password must not be empty');
  });

  it('shows error when whitespace-only password is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('   ');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Password must not be empty');
  });

  it('transitions to database step after valid password', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Database name');
  });

  it('shows error when database name has invalid characters', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    // Submit password to advance to database step
    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));

    // Submit database name with invalid characters
    helper.submit('my-database!');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain(
      'Database name must contain only letters, numbers, and underscores'
    );
  });

  it('transitions to port step after valid database name', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port');
  });

  it('shows error when port is not a number', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('notaport');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port must be a number');
  });

  it('shows error when port is below valid range', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('80');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port must be between 1024 and 65535');
  });

  it('shows error when port is above valid range', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('99999');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port must be between 1024 and 65535');
  });

  it('transitions to version step after valid port', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('PostgreSQL version');
  });

  it('shows done screen after all four steps', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('PostgreSQL configuration saved');
  });

  it('calls _updatePostgresqlConfig with correct values on completion', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        profile="default"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={updateConfig}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      {
        enabled: true,
        port: 5432,
        database: 'mydb',
        version: '16',
      },
      'secret123',
      'default',
      undefined
    );
  });

  it('uses default database name "postgres" when empty is submitted', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        profile="default"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={updateConfig}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    // Submit empty database — should default to 'postgres'
    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      expect.objectContaining({ database: 'postgres' }),
      'secret123',
      'default',
      undefined
    );
  });

  it('uses default port 5432 when empty is submitted', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        profile="default"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={updateConfig}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    // Submit empty port — should default to 5432
    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      expect.objectContaining({ port: 5432 }),
      'secret123',
      'default',
      undefined
    );
  });

  it('uses default version "16" when empty is submitted', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();
    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        profile="default"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={updateConfig}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    // Submit empty version — should default to '16'
    helper.submit('');
    await new Promise((r) => setTimeout(r, 200));

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      expect.objectContaining({ version: '16' }),
      'secret123',
      'default',
      undefined
    );
  });

  it('pre-fills password from existing credentials', () => {
    let capturedValue = '';
    const TextInput = (props: TextInputProps): null => {
      capturedValue = props.value;
      return null;
    };

    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => 'existingpass'}
        _updatePostgresqlConfig={() => {}}
      />
    );

    expect(capturedValue).toBe('existingpass');
  });

  it('uses custom profile when provided', async () => {
    const helper = makeTextInputHelper();
    const updateConfig = jest.fn();

    render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        profile="production"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={updateConfig}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    expect(updateConfig).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      'production',
      undefined
    );
  });

  it('shows done screen with database name, port, and version', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <PostgresqlInitWizard
        destination="/tmp/dest"
        _TextInput={helper.TextInput}
        _loadPostgresqlConfig={() => defaultConfig}
        _loadPostgresPassword={() => undefined}
        _updatePostgresqlConfig={() => {}}
      />
    );

    helper.submit('secret123');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('mydb');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('5432');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('16');
    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('mydb');
    expect(frame).toContain('5432');
    expect(frame).toContain('16');
    expect(frame).toContain('postgresql install');
  });
});
