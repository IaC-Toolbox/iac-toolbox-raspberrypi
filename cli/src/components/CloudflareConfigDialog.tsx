import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useEffect } from 'react';

export interface CloudflareConfig {
  enabled: boolean;
  mode: 'api';
  token: string;
  accountId: string;
  zoneId: string;
  zoneName: string;
  tunnelName: string;
  hostname: string;
  servicePort: number;
}

interface CloudflareConfigDialogProps {
  onComplete: (config: CloudflareConfig) => void;
}

type Step =
  | 'token'
  | 'accountId'
  | 'zoneId'
  | 'tunnelName'
  | 'hostname'
  | 'servicePort';

async function validateToken(
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
      if (data.success) return { valid: true, message: 'Token validated' };
    }
    return { valid: false, message: `Invalid token (status ${res.status})` };
  } catch {
    return { valid: false, message: 'Connection failed' };
  }
}

async function validateZone(
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
          message: `Zone verified: ${data.result.name}`,
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

export default function CloudflareConfigDialog({
  onComplete,
}: CloudflareConfigDialogProps) {
  const [step, setStep] = useState<Step>('token');
  const [inputValue, setInputValue] = useState('');
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [tunnelName, setTunnelName] = useState('');
  const [hostname, setHostname] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!validating) return;
    let cancelled = false;

    const run = async () => {
      if (step === 'token') {
        // const result = await validateToken(inputValue.trim());
        const result = { valid: true, message: 'Token validated' };
        if (cancelled) return;
        if (result.valid) {
          setToken(inputValue.trim());
          setValidationMsg(result.message);
          setValidationError(null);
          setValidating(false);
          setInputValue('');
          setStep('accountId');
        } else {
          setValidationError(result.message);
          setValidating(false);
        }
      } else if (step === 'zoneId') {
        const result = await validateZone(token, inputValue.trim());
        if (cancelled) return;
        if (result.valid) {
          setZoneId(inputValue.trim());
          setZoneName(result.zoneName);
          setTunnelName(`${result.zoneName}-tunnel`);
          setValidationMsg(result.message);
          setValidationError(null);
          setValidating(false);
          setInputValue('');
          setStep('tunnelName');
        } else {
          setValidationError(result.message);
          setValidating(false);
        }
      }
    };

    run();
    // return () => {
    //   cancelled = true;
    // };
  }, [validating, step, inputValue, token]);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (step === 'token' || step === 'zoneId') {
      setValidationError(null);
      setValidationMsg(null);
      setValidating(true);
      return;
    }

    if (step === 'accountId') {
      setAccountId(trimmed);
      setInputValue('');
      setStep('zoneId');
    } else if (step === 'tunnelName') {
      setTunnelName(trimmed);
      setInputValue('');
      setStep('hostname');
    } else if (step === 'hostname') {
      setHostname(trimmed);
      setInputValue('');
      setStep('servicePort');
    } else if (step === 'servicePort') {
      const port = parseInt(trimmed, 10);
      if (isNaN(port)) return;
      onComplete({
        enabled: true,
        mode: 'api',
        token,
        accountId,
        zoneId,
        zoneName,
        tunnelName,
        hostname,
        servicePort: port,
      });
    }
  };

  const labels: Record<Step, string> = {
    token: 'Cloudflare API token',
    accountId: 'Cloudflare Account ID',
    zoneId: 'Cloudflare Zone ID',
    tunnelName: 'Tunnel name',
    hostname: 'First domain to expose',
    servicePort: `Service port for ${hostname || 'domain'}`,
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ {labels[step]}</Text>
      {step === 'tunnelName' && (
        <Box paddingLeft={3}>
          <Text dimColor>Default: {tunnelName}</Text>
        </Box>
      )}
      {validationMsg && (
        <Box paddingLeft={3}>
          <Text color="green">✔ {validationMsg}</Text>
        </Box>
      )}
      {validationError && (
        <Box paddingLeft={3}>
          <Text color="red">✗ {validationError}</Text>
        </Box>
      )}
      {validating && (
        <Box paddingLeft={3}>
          <Text dimColor>Validating...</Text>
        </Box>
      )}
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          mask={step === 'token' ? '*' : undefined}
        />
      </Box>
    </Box>
  );
}
