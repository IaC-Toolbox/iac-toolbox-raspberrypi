import { Box, Text, useApp } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadCredentials,
  saveCredentials,
} from '../../loaders/credentials-loader.js';
import {
  updateCloudflareConfig,
  loadCloudflareConfig,
} from './cloudflare-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface ValidateTokenFn {
  (token: string): Promise<{ valid: boolean; message: string }>;
}

interface ValidateZoneFn {
  (
    token: string,
    zoneId: string
  ): Promise<{ valid: boolean; zoneName: string; message: string }>;
}

interface CloudflareInitWizardProps {
  profile: string;
  destination: string;
  /** Injectable for testing */
  _TextInput?: (props: TextInputProps) => null;
  /** Injectable for testing */
  _loadCredentials?: (profile: string) => Record<string, string>;
  /** Injectable for testing */
  _saveCredentials?: (
    credentials: Record<string, string>,
    profile: string
  ) => void;
  /** Injectable for testing */
  _updateCloudflareConfig?: (
    destination: string,
    options: {
      accountId: string;
      zoneId: string;
      tunnelName: string;
      hostname: string;
      servicePort: number;
    }
  ) => void;
  /** Injectable for testing */
  _loadCloudflareConfig?: (destination: string) =>
    | {
        account_id?: string;
        zone_id?: string;
        tunnel_name?: string;
        domains?: Array<{ hostname: string; service_port: number }>;
      }
    | undefined;
  /** Injectable for testing */
  _validateToken?: ValidateTokenFn;
  /** Injectable for testing */
  _validateZone?: ValidateZoneFn;
}

type Step =
  | 'token'
  | 'accountId'
  | 'zoneId'
  | 'tunnelName'
  | 'hostname'
  | 'servicePort'
  | 'done';

const HEX_32_REGEX = /^[0-9a-f]{32}$/i;

async function defaultValidateToken(
  token: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch(
      'https://api.cloudflare.com/client/v4/user/tokens/verify',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        return { valid: true, message: 'Token verified' };
      }
    }
    return { valid: false, message: `Cloudflare returned ${res.status}` };
  } catch {
    return { valid: false, message: 'Connection failed' };
  }
}

async function defaultValidateZone(
  token: string,
  zoneId: string
): Promise<{ valid: boolean; zoneName: string; message: string }> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        result?: { name?: string };
      };
      if (data.success && data.result?.name) {
        return {
          valid: true,
          zoneName: data.result.name,
          message: `Zone: ${data.result.name}`,
        };
      }
    }
    return {
      valid: false,
      zoneName: '',
      message: `Invalid zone (status ${res.status})`,
    };
  } catch {
    return { valid: false, zoneName: '', message: 'Connection failed' };
  }
}

export default function CloudflareInitWizard({
  profile,
  destination,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _loadCredentials = loadCredentials,
  _saveCredentials = saveCredentials,
  _updateCloudflareConfig = updateCloudflareConfig,
  _loadCloudflareConfig = loadCloudflareConfig,
  _validateToken = defaultValidateToken,
  _validateZone = defaultValidateZone,
}: CloudflareInitWizardProps) {
  const { exit } = useApp();
  const creds = _loadCredentials(profile);
  const existingConfig = _loadCloudflareConfig(destination);

  const existingToken = creds.cloudflare_api_token || '';
  const existingAccountId = existingConfig?.account_id || '';
  const existingZoneId = existingConfig?.zone_id || '';
  const existingTunnelName = existingConfig?.tunnel_name || '';
  const existingHostname = existingConfig?.domains?.[0]?.hostname || '';
  const existingPort = existingConfig?.domains?.[0]?.service_port;

  const [step, setStep] = useState<Step>('token');
  const [inputValue, setInputValue] = useState(existingToken);
  const [pendingValue, setPendingValue] = useState('');
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [tunnelName, setTunnelName] = useState('');
  const [hostname, setHostname] = useState('');
  const [servicePort, setServicePort] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const InputComponent = _TextInput;

  // Handle async validation using pendingValue (captured at submit time)
  useEffect(() => {
    if (!validating) return;
    let cancelled = false;

    const run = async () => {
      if (step === 'token') {
        const result = await _validateToken(pendingValue);
        if (cancelled) return;
        if (result.valid) {
          setToken(pendingValue);
          setValidationMsg(result.message);
          setError(null);
          setValidating(false);
          setInputValue(existingAccountId);
          setStep('accountId');
        } else {
          setError(result.message);
          setValidating(false);
        }
      } else if (step === 'zoneId') {
        const result = await _validateZone(token, pendingValue);
        if (cancelled) return;
        if (result.valid) {
          setZoneId(pendingValue);
          setZoneName(result.zoneName);
          setValidationMsg(result.message);
          setError(null);
          setValidating(false);
          const suggestedTunnel =
            existingTunnelName || `${result.zoneName}-tunnel`;
          setInputValue(suggestedTunnel);
          setStep('tunnelName');
        } else {
          setError(result.message);
          setValidating(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    validating,
    step,
    pendingValue,
    token,
    existingAccountId,
    existingTunnelName,
    _validateToken,
    _validateZone,
  ]);

  // Save on done
  useEffect(() => {
    if (step === 'done') {
      _saveCredentials(
        {
          cloudflare_api_token: token,
        },
        profile
      );
      _updateCloudflareConfig(destination, {
        accountId,
        zoneId,
        tunnelName,
        hostname,
        servicePort,
      });
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    token,
    accountId,
    zoneId,
    tunnelName,
    hostname,
    servicePort,
    profile,
    destination,
    exit,
    _saveCredentials,
    _updateCloudflareConfig,
  ]);

  const header = (
    <>
      <Text bold color="cyan">
        {'┌  IaC-Toolbox — Cloudflare Tunnel Setup'}
      </Text>
      <Text bold>{'│'}</Text>
    </>
  );

  if (step === 'token') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text bold>{'◆  Cloudflare API token'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        {validating && (
          <Box paddingLeft={3}>
            <Text dimColor>Validating...</Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('API token must not be empty');
                return;
              }
              setPendingValue(trimmed);
              setError(null);
              setValidating(true);
            }}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (step === 'accountId') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Cloudflare API token: ********'}</Text>
        {validationMsg && (
          <Box paddingLeft={3}>
            <Text color="green">
              {'✔ '}
              {validationMsg}
            </Text>
          </Box>
        )}
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Cloudflare Account ID'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Account ID must not be empty');
                return;
              }
              if (!HEX_32_REGEX.test(trimmed)) {
                setError(
                  'Account ID must be exactly 32 hexadecimal characters'
                );
                return;
              }
              setAccountId(trimmed);
              setError(null);
              setInputValue(existingZoneId);
              setStep('zoneId');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'zoneId') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Cloudflare API token: ********'}</Text>
        <Text dimColor>
          {'◇  Account ID: '}
          {accountId}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Cloudflare Zone ID'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        {validating && (
          <Box paddingLeft={3}>
            <Text dimColor>Validating...</Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Zone ID must not be empty');
                return;
              }
              if (!HEX_32_REGEX.test(trimmed)) {
                setError('Zone ID must be exactly 32 hexadecimal characters');
                return;
              }
              setPendingValue(trimmed);
              setError(null);
              setValidating(true);
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'tunnelName') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Cloudflare API token: ********'}</Text>
        <Text dimColor>
          {'◇  Account ID: '}
          {accountId}
        </Text>
        <Text dimColor>
          {'◇  Zone ID: '}
          {zoneId}
        </Text>
        {validationMsg && (
          <Box paddingLeft={3}>
            <Text color="green">
              {'✔ '}
              {validationMsg}
            </Text>
          </Box>
        )}
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Tunnel name'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Tunnel name must not be empty');
                return;
              }
              setTunnelName(trimmed);
              setError(null);
              setInputValue(existingHostname);
              setStep('hostname');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'hostname') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Cloudflare API token: ********'}</Text>
        <Text dimColor>
          {'◇  Account ID: '}
          {accountId}
        </Text>
        <Text dimColor>
          {'◇  Zone ID: '}
          {zoneId}
          {zoneName ? ` (${zoneName})` : ''}
        </Text>
        <Text dimColor>
          {'◇  Tunnel: '}
          {tunnelName}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  First domain to expose through the tunnel'}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Hostname must not be empty');
                return;
              }
              setHostname(trimmed);
              setError(null);
              setInputValue(existingPort ? String(existingPort) : '');
              setStep('servicePort');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'servicePort') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Cloudflare API token: ********'}</Text>
        <Text dimColor>
          {'◇  Account ID: '}
          {accountId}
        </Text>
        <Text dimColor>
          {'◇  Zone ID: '}
          {zoneId}
          {zoneName ? ` (${zoneName})` : ''}
        </Text>
        <Text dimColor>
          {'◇  Tunnel: '}
          {tunnelName}
        </Text>
        <Text dimColor>
          {'◇  Hostname: '}
          {hostname}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{`◆  Service port for ${hostname}`}</Text>
        {error && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {error}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setError('Port must not be empty');
                return;
              }
              const port = parseInt(trimmed, 10);
              if (isNaN(port) || port < 1 || port > 65535) {
                setError('Port must be an integer between 1 and 65535');
                return;
              }
              setServicePort(port);
              setError(null);
              setStep('done');
            }}
          />
        </Box>
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Cloudflare configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {
          '│  API token       ************              → ~/.iac-toolbox/credentials'
        }
      </Text>
      <Text>
        {'│  Account ID      '}
        {accountId.substring(0, 10)}
        {'...'}
        {'               → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Zone ID         '}
        {zoneId.substring(0, 10)}
        {'...'}
        {zoneName ? `  (${zoneName})` : ''}
        {'  → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Tunnel          '}
        {tunnelName}
        {'               → iac-toolbox.yml'}
      </Text>
      <Text>
        {'│  Domain          '}
        {hostname}
        {':'}
        {servicePort}
        {'  → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install Cloudflare Tunnel, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox cloudflare install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { CloudflareInitWizardProps, TextInputProps };
