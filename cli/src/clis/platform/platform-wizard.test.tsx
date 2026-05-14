import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import PlatformWizard from './platform-wizard.js';

/**
 * PlatformWizard tests.
 *
 * Uses injectable _SelectInput, _TextInput, _generateConfig, _generatePassword,
 * _saveCredentials, _testSshConnection, and _writeFile props to avoid
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

const VALID_HEX_32 = 'a'.repeat(32);
const VALID_ZONE_ID = 'b'.repeat(32);

const defaultProps = {
  profile: 'default',
  output: './iac-toolbox.yml',
  _generateConfig: jest
    .fn<(inputs: unknown) => string>()
    .mockReturnValue('yaml-content'),
  _generatePassword: jest.fn<() => string>().mockReturnValue('TestPass123!'),
  _saveCredentials:
    jest.fn<(creds: Record<string, string>, profile: string) => void>(),
  _testSshConnection: jest
    .fn<(host: string, user: string, key: string) => Promise<boolean>>()
    .mockResolvedValue(true),
  _writeFile: jest.fn<(path: string, content: string) => void>(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlatformWizard', () => {
  describe('Step 1: target_mode', () => {
    it('renders mode selection on initial render', () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('IaC-Toolbox');
      expect(output).toContain('Observability Setup');
      expect(output).toContain('Where do you want to install');
    });

    it('selecting localhost skips SSH steps and goes to cloudflare gate', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Cloudflare Tunnel');
    });

    it('selecting remote transitions to ssh_string step', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('SSH connection string');
      expect(frame).toContain('remote');
    });
  });

  describe('Step 2: ssh_string validation', () => {
    it('shows error for connection string without @', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));

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
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('@192.168.1.50');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Invalid format');
    });

    it('shows error for empty host in connection string', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('pi@');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Invalid format');
    });

    it('advances to ssh_key step after valid connection string', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('SSH private key path');
      expect(frame).toContain('pi@raspberry-4b.local');
    });
  });

  describe('Step 3: ssh_key + ping', () => {
    it('shows error for empty ssh key path', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('SSH key path must not be empty');
    });

    it('shows testing screen after valid ssh key submitted', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={() => new Promise(() => {})}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/id_ed25519');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Pinging');
      expect(frame).toContain('raspberry-4b.local');
    });

    it('advances to cloudflare gate on successful ssh test', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => true}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/id_ed25519');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Cloudflare Tunnel');
    });

    it('shows ssh_error screen on failed ssh connection', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => false}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/id_ed25519');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('SSH connection failed');
      expect(frame).toContain('Could not reach');
    });

    it('shows ssh_error screen with key field after failed SSH', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => false}
        />
      );

      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/wrong-key');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      // ssh_error step shows failure message and re-prompts for the key
      expect(frame).toContain('SSH connection failed');
      expect(frame).toContain('SSH private key path');
    });
  });

  describe('Step 4: cloudflare_gate', () => {
    it('selecting No skips domain steps and goes to done', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
        />
      );

      // Select localhost -> cloudflare gate
      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      // Select No for Cloudflare
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Configuration saved');
    });

    it('selecting Yes shows domain step', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('domain');
    });
  });

  describe('Step 5: domain validation', () => {
    it('shows error for empty domain', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Domain must not be empty');
    });

    it('shows error for domain without dot', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('nodot');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Domain must not be empty');
    });

    it('advances to account_id after valid domain', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));

      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Cloudflare Account ID');
    });
  });

  describe('Step 6: account_id validation', () => {
    async function goToAccountId(
      selectHelper: ReturnType<typeof makeSelectInputHelper>,
      textHelper: ReturnType<typeof makeTextInputHelper>
    ) {
      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));
    }

    it('shows error for non-hex account ID', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      await goToAccountId(selectHelper, textHelper);

      textHelper.submit('too-short');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('32 hexadecimal characters');
    });

    it('advances to zone_id after valid account ID', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      await goToAccountId(selectHelper, textHelper);

      textHelper.submit(VALID_HEX_32);
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Cloudflare Zone ID');
    });
  });

  describe('Step 7: zone_id validation', () => {
    async function goToZoneId(
      selectHelper: ReturnType<typeof makeSelectInputHelper>,
      textHelper: ReturnType<typeof makeTextInputHelper>
    ) {
      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_HEX_32);
      await new Promise((r) => setTimeout(r, 50));
    }

    it('shows error for non-hex zone ID', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      await goToZoneId(selectHelper, textHelper);

      textHelper.submit('notvalid');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('32 hexadecimal characters');
    });

    it('advances to api_token after valid zone ID', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      await goToZoneId(selectHelper, textHelper);

      textHelper.submit(VALID_ZONE_ID);
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Cloudflare API Token');
    });
  });

  describe('Step 8: api_token', () => {
    async function goToApiToken(
      selectHelper: ReturnType<typeof makeSelectInputHelper>,
      textHelper: ReturnType<typeof makeTextInputHelper>
    ) {
      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_HEX_32);
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_ZONE_ID);
      await new Promise((r) => setTimeout(r, 50));
    }

    it('shows error for empty api token', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
        />
      );

      await goToApiToken(selectHelper, textHelper);

      textHelper.submit('');
      await new Promise((r) => setTimeout(r, 50));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('API token must not be empty');
    });

    it('advances to done after valid api token', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const saveCredsFn =
        jest.fn<(creds: Record<string, string>, profile: string) => void>();
      const writeFileFn = jest.fn<(path: string, content: string) => void>();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _saveCredentials={saveCredsFn}
          _writeFile={writeFileFn}
        />
      );

      await goToApiToken(selectHelper, textHelper);

      textHelper.submit('my-secret-api-token');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Configuration saved');
    });
  });

  describe('Done: summary screen', () => {
    it('shows written path in done screen', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const writeFileFn = jest.fn<(path: string, content: string) => void>();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          output="./my-config.yml"
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
          _writeFile={writeFileFn}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('./my-config.yml');
    });

    it('calls writeFile with the output path on done', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const writeFileFn = jest.fn<(path: string, content: string) => void>();
      render(
        <PlatformWizard
          {...defaultProps}
          output="./test-output.yml"
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
          _writeFile={writeFileFn}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      expect(writeFileFn).toHaveBeenCalledWith(
        './test-output.yml',
        expect.any(String)
      );
    });

    it('calls saveCredentials with grafana_admin_password on done', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const saveCredsFn =
        jest.fn<(creds: Record<string, string>, profile: string) => void>();
      render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
          _saveCredentials={saveCredsFn}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      expect(saveCredsFn).toHaveBeenCalledWith(
        expect.objectContaining({ grafana_admin_password: expect.any(String) }),
        'default'
      );
    });

    it('shows SSH tunnel shortcut when remote and cloudflare disabled', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => true}
        />
      );

      // remote, cloudflare disabled
      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/id_ed25519');
      await new Promise((r) => setTimeout(r, 200));
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('SSH tunnel shortcut');
      expect(frame).toContain('3000:localhost:3000');
    });

    it('does not show SSH tunnel shortcut when cloudflare enabled', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const { lastFrame } = render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => true}
        />
      );

      // remote, cloudflare enabled
      selectHelper.select('remote');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('pi@raspberry-4b.local');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('~/.ssh/id_ed25519');
      await new Promise((r) => setTimeout(r, 200));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_HEX_32);
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_ZONE_ID);
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('my-secret-token');
      await new Promise((r) => setTimeout(r, 200));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Configuration saved');
      expect(frame).not.toContain('SSH tunnel shortcut');
    });

    it('includes cloudflare_api_token in saved credentials when cloudflare enabled', async () => {
      const selectHelper = makeSelectInputHelper();
      const textHelper = makeTextInputHelper();
      const saveCredsFn =
        jest.fn<(creds: Record<string, string>, profile: string) => void>();
      render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={textHelper.TextInput}
          _testSshConnection={async () => true}
          _saveCredentials={saveCredsFn}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('yes');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('example.com');
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_HEX_32);
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit(VALID_ZONE_ID);
      await new Promise((r) => setTimeout(r, 50));
      textHelper.submit('my-secret-token');
      await new Promise((r) => setTimeout(r, 200));

      expect(saveCredsFn).toHaveBeenCalledWith(
        expect.objectContaining({
          grafana_admin_password: expect.any(String),
          cloudflare_api_token: 'my-secret-token',
        }),
        'default'
      );
    });

    it('does not include cloudflare_api_token in saved credentials when cloudflare disabled', async () => {
      const selectHelper = makeSelectInputHelper();
      const { TextInput } = makeTextInputHelper();
      const saveCredsFn =
        jest.fn<(creds: Record<string, string>, profile: string) => void>();
      render(
        <PlatformWizard
          {...defaultProps}
          _SelectInput={
            selectHelper.SelectInput as unknown as typeof import('ink-select-input').default
          }
          _TextInput={TextInput}
          _saveCredentials={saveCredsFn}
        />
      );

      selectHelper.select('local');
      await new Promise((r) => setTimeout(r, 50));
      selectHelper.select('no');
      await new Promise((r) => setTimeout(r, 200));

      expect(saveCredsFn).toHaveBeenCalledWith(
        expect.not.objectContaining({
          cloudflare_api_token: expect.any(String),
        }),
        'default'
      );
    });
  });
});
