import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import CloudflareInitWizard from './cloudflare-init-wizard.js';

/**
 * CloudflareInitWizard tests.
 *
 * Uses injectable props to avoid filesystem, TTY, and network dependencies.
 * Follows the pattern from GrafanaInitWizard.test.tsx.
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

const VALID_HEX_32 = 'a'.repeat(32);
const VALID_ZONE_ID = 'b'.repeat(32);

/** Token validator that always succeeds */
const successTokenValidator = async () => ({
  valid: true,
  message: 'Token verified',
});

/** Token validator that always fails */
const failTokenValidator = async () => ({
  valid: false,
  message: 'Invalid token',
});

/** Zone validator that always succeeds */
const successZoneValidator = async () => ({
  valid: true,
  zoneName: 'example.com',
  message: 'Zone: example.com',
});

/** Zone validator that always fails */
const failZoneValidator = async () => ({
  valid: false,
  zoneName: '',
  message: 'Invalid zone',
});

const defaultProps = {
  profile: 'default',
  destination: '/tmp/dest',
  _loadCredentials: () => ({}),
  _saveCredentials: () => {},
  _updateCloudflareConfig: () => {},
  _loadCloudflareConfig: () => undefined,
  _validateToken: successTokenValidator,
  _validateZone: successZoneValidator,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloudflareInitWizard', () => {
  it('renders the API token prompt on initial render', () => {
    const { TextInput } = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={TextInput} />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('IaC-Toolbox');
    expect(output).toContain('Cloudflare Tunnel Setup');
    expect(output).toContain('Cloudflare API token');
  });

  it('shows error when empty token is submitted', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('API token must not be empty');
  });

  it('shows error when token validation fails', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={helper.TextInput}
        _validateToken={failTokenValidator}
      />
    );

    helper.submit('bad-token');
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Invalid token');
  });

  it('transitions to account ID step after valid token', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare Account ID');
    expect(frame).toContain('Token verified');
  });

  it('shows error when account ID is not 32 hex chars', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    // Submit token
    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    // Submit invalid account ID
    helper.submit('too-short');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('32 hexadecimal characters');
  });

  it('transitions to zone ID step after valid account ID', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    // Submit token
    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    // Submit valid account ID
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare Zone ID');
  });

  it('shows error when zone ID is not 32 hex chars', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    // Submit token
    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    // Submit valid account ID
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));

    // Submit invalid zone ID
    helper.submit('xyz');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('32 hexadecimal characters');
  });

  it('shows error when zone validation fails', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={helper.TextInput}
        _validateZone={failZoneValidator}
      />
    );

    // Submit token
    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    // Submit valid account ID
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));

    // Submit valid format zone ID (but API rejects it)
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Invalid zone');
  });

  it('transitions to tunnel name step after valid zone ID', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    // Submit token
    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    // Submit account ID
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));

    // Submit zone ID
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Tunnel name');
    expect(frame).toContain('Zone: example.com');
  });

  it('shows error when tunnel name is empty', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));

    // Submit empty tunnel name
    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Tunnel name must not be empty');
  });

  it('transitions to hostname step after tunnel name', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('First domain to expose');
  });

  it('shows error when hostname is empty', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));

    // Submit empty hostname
    helper.submit('');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Hostname must not be empty');
  });

  it('transitions to service port step after hostname', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('grafana.example.com');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Service port for grafana.example.com');
  });

  it('shows error for invalid port', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('grafana.example.com');
    await new Promise((r) => setTimeout(r, 50));

    // Submit invalid port
    helper.submit('abc');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port must be an integer between 1 and 65535');
  });

  it('shows error for port out of range', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('grafana.example.com');
    await new Promise((r) => setTimeout(r, 50));

    // Submit out of range port
    helper.submit('70000');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Port must be an integer between 1 and 65535');
  });

  it('shows done screen and calls save functions on complete', async () => {
    const helper = makeTextInputHelper();
    const saveCreds = jest.fn();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={helper.TextInput}
        _saveCredentials={saveCreds}
        _updateCloudflareConfig={updateConfig}
      />
    );

    helper.submit('my-api-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('example.com-tunnel');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('grafana.example.com');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('3000');
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare configuration saved');
    expect(frame).toContain('iac-toolbox cloudflare install');

    expect(saveCreds).toHaveBeenCalledWith(
      { cloudflare_api_token: 'my-api-token' },
      'default'
    );
    expect(updateConfig).toHaveBeenCalledWith('/tmp/dest', {
      accountId: VALID_HEX_32,
      zoneId: VALID_ZONE_ID,
      tunnelName: 'example.com-tunnel',
      hostname: 'grafana.example.com',
      servicePort: 3000,
    });
  });

  it('pre-fills values from existing credentials and config', async () => {
    const capturedValues: string[] = [];
    let callCount = 0;
    const CapturingTextInput = (props: TextInputProps): null => {
      capturedValues[callCount] = props.value;
      callCount++;
      return null;
    };

    render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={CapturingTextInput}
        _loadCredentials={() => ({
          cloudflare_api_token: 'existing-token',
        })}
        _loadCloudflareConfig={() => ({
          account_id: 'c'.repeat(32),
          zone_id: 'd'.repeat(32),
          tunnel_name: 'my-tunnel',
          domains: [{ hostname: 'app.example.com', service_port: 8080 }],
        })}
      />
    );

    // The first render should show the token step with existing token
    expect(capturedValues[0]).toBe('existing-token');
  });

  it('uses custom profile when provided', async () => {
    const helper = makeTextInputHelper();
    const loadCreds = jest.fn<(profile: string) => Record<string, string>>();
    loadCreds.mockReturnValue({});
    const saveCreds = jest.fn();

    render(
      <CloudflareInitWizard
        {...defaultProps}
        profile="production"
        _TextInput={helper.TextInput}
        _loadCredentials={loadCreds}
        _saveCredentials={saveCreds}
      />
    );

    expect(loadCreds).toHaveBeenCalledWith('production');

    // Complete the wizard
    helper.submit('my-token');
    await new Promise((r) => setTimeout(r, 100));
    helper.submit(VALID_HEX_32);
    await new Promise((r) => setTimeout(r, 50));
    helper.submit(VALID_ZONE_ID);
    await new Promise((r) => setTimeout(r, 100));
    helper.submit('tunnel');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('app.example.com');
    await new Promise((r) => setTimeout(r, 50));
    helper.submit('8080');
    await new Promise((r) => setTimeout(r, 50));

    expect(saveCreds).toHaveBeenCalledWith(expect.any(Object), 'production');
  });
});
