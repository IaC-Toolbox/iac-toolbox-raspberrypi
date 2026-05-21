import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import CloudflareInitWizard from './cloudflare-init-wizard.js';
import type { MultiSelectItem } from './cloudflare-init-wizard.js';

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

interface MultiSelectProps {
  label: string;
  items: MultiSelectItem[];
  defaultSelected?: Set<string>;
  onSubmit: (selected: MultiSelectItem[]) => void;
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

function makeMultiSelectHelper(): {
  MultiSelectComponent: (props: MultiSelectProps) => null;
  submit: (selected: MultiSelectItem[]) => void;
  getLabel: () => string | undefined;
  getDefaultSelected: () => Set<string> | undefined;
} {
  let onSubmitFn: ((selected: MultiSelectItem[]) => void) | undefined;
  let labelValue: string | undefined;
  let defaultSelectedValue: Set<string> | undefined;

  const MultiSelectComponent = (props: MultiSelectProps): null => {
    onSubmitFn = props.onSubmit;
    labelValue = props.label;
    defaultSelectedValue = props.defaultSelected;
    return null;
  };

  return {
    MultiSelectComponent,
    submit: (selected) => onSubmitFn?.(selected),
    getLabel: () => labelValue,
    getDefaultSelected: () => defaultSelectedValue,
  };
}

const VALID_HEX_32 = 'a'.repeat(32);
const VALID_ZONE_ID = 'b'.repeat(32);

const ALL_SERVICES: MultiSelectItem[] = [
  { label: 'grafana', value: 'grafana' },
  { label: 'prometheus', value: 'prometheus' },
  { label: 'loki', value: 'loki' },
];

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
// Helper: advance wizard through token → accountId → zoneId → tunnelName
// ---------------------------------------------------------------------------

async function advanceToServicesStep(
  helper: ReturnType<typeof makeTextInputHelper>,
  tunnelName = 'example.com-tunnel'
): Promise<void> {
  helper.submit('valid-token');
  await new Promise((r) => setTimeout(r, 100));
  helper.submit(VALID_HEX_32);
  await new Promise((r) => setTimeout(r, 50));
  helper.submit(VALID_ZONE_ID);
  await new Promise((r) => setTimeout(r, 100));
  helper.submit(tunnelName);
  await new Promise((r) => setTimeout(r, 50));
}

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

  it('skips token validation and transitions to account ID step', async () => {
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

    // Token validation is skipped regardless of _validateToken — always transitions
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare Account ID');
    expect(frame).toContain('Token validation skiped');
  });

  it('transitions to account ID step after token submission', async () => {
    const helper = makeTextInputHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard {...defaultProps} _TextInput={helper.TextInput} />
    );

    helper.submit('valid-token');
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare Account ID');
    expect(frame).toContain('Token validation skiped');
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

  it('transitions to services step after tunnel name', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
      />
    );

    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    // MultiSelect should have been rendered with the correct label
    expect(msHelper.getLabel()).toBe('Services to expose through the tunnel');
  });

  it('services step pre-selects all three services on first run', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
      />
    );

    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    const defaultSelected = msHelper.getDefaultSelected();
    expect(defaultSelected).toBeDefined();
    expect(defaultSelected!.has('grafana')).toBe(true);
    expect(defaultSelected!.has('prometheus')).toBe(true);
    expect(defaultSelected!.has('loki')).toBe(true);
  });

  it('shows done screen and calls save functions on complete', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    const saveCreds = jest.fn();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
        _saveCredentials={saveCreds}
        _updateCloudflareConfig={updateConfig}
      />
    );

    // Advance to services step
    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    // Confirm with all three services selected
    msHelper.submit(ALL_SERVICES);
    await new Promise((r) => setTimeout(r, 150));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare configuration saved');
    expect(frame).toContain('iac-toolbox cloudflare install');

    expect(saveCreds).toHaveBeenCalledWith(
      { cloudflare_api_token: 'valid-token' },
      'default'
    );
    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      expect.objectContaining({
        accountId: VALID_HEX_32,
        zoneId: VALID_ZONE_ID,
        tunnelName: 'example.com-tunnel',
        domains: expect.arrayContaining([
          expect.objectContaining({ hostname: 'grafana.example.com' }),
          expect.objectContaining({ hostname: 'prometheus.example.com' }),
          expect.objectContaining({ hostname: 'loki.example.com' }),
        ]),
      }),
      undefined
    );
  });

  it('done screen lists each saved domain hostname', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
      />
    );

    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    // Confirm with all services selected
    msHelper.submit(ALL_SERVICES);
    await new Promise((r) => setTimeout(r, 150));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('grafana.example.com');
    expect(frame).toContain('prometheus.example.com');
    expect(frame).toContain('loki.example.com');
  });

  it('does not advance to done when zero services are selected', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
      />
    );

    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    // Submit empty selection — should not advance
    msHelper.submit([]);
    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Cloudflare configuration saved');
  });

  it('writes only selected service domains when subset is chosen', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    const updateConfig = jest.fn();
    const { lastFrame } = render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
        _updateCloudflareConfig={updateConfig}
      />
    );

    await advanceToServicesStep(textHelper);
    await new Promise((r) => setTimeout(r, 50));

    // Submit only grafana
    msHelper.submit([{ label: 'grafana', value: 'grafana' }]);
    await new Promise((r) => setTimeout(r, 150));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Cloudflare configuration saved');

    expect(updateConfig).toHaveBeenCalledWith(
      '/tmp/dest',
      expect.objectContaining({
        domains: [
          {
            hostname: 'grafana.example.com',
            service_port: 3000,
            service: 'http://localhost:3000',
          },
        ],
      }),
      undefined
    );
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

  it('pre-selects only services present in existing config domains', async () => {
    const textHelper = makeTextInputHelper();
    const msHelper = makeMultiSelectHelper();
    render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={textHelper.TextInput}
        _MultiSelect={msHelper.MultiSelectComponent}
        _loadCloudflareConfig={() => ({
          account_id: VALID_HEX_32,
          zone_id: VALID_ZONE_ID,
          tunnel_name: 'my-tunnel',
          // Only grafana is in the existing config
          domains: [{ hostname: 'grafana.example.com', service_port: 3000 }],
        })}
      />
    );

    await advanceToServicesStep(textHelper, 'my-tunnel');
    await new Promise((r) => setTimeout(r, 50));

    const defaultSelected = msHelper.getDefaultSelected();
    expect(defaultSelected).toBeDefined();
    // grafana should be pre-selected (it was in config)
    expect(defaultSelected!.has('grafana')).toBe(true);
    // prometheus and loki should NOT be pre-selected
    expect(defaultSelected!.has('prometheus')).toBe(false);
    expect(defaultSelected!.has('loki')).toBe(false);
  });

  it('passes filePath to _loadCloudflareConfig', () => {
    const helper = makeTextInputHelper();
    const loadConfig = jest.fn<
      (
        destination: string,
        filePath?: string
      ) =>
        | {
            account_id?: string;
            zone_id?: string;
            tunnel_name?: string;
            domains?: Array<{ hostname: string; service_port: number }>;
          }
        | undefined
    >();
    loadConfig.mockReturnValue(undefined);

    render(
      <CloudflareInitWizard
        {...defaultProps}
        _TextInput={helper.TextInput}
        _loadCloudflareConfig={loadConfig}
        filePath="/custom/path.yml"
      />
    );

    expect(loadConfig).toHaveBeenCalledWith('/tmp/dest', '/custom/path.yml');
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
  });
});
