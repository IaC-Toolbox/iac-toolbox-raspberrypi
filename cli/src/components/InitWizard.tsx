import { Box, Text, useApp } from 'ink';
import RealSelectInput from 'ink-select-input';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import fs from 'fs';
import { saveCredentials } from '../utils/credentials.js';
import {
  generateConfig,
  generatePassword,
  type WizardInputs,
} from '../utils/configGenerator.js';

// ---------------------------------------------------------------------------
// Types
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

export interface InitWizardProps {
  profile: string;
  output: string;
  /** Injectable deps for testing */
  _SelectInput?: typeof RealSelectInput;
  _TextInput?: (props: TextInputProps) => null;
  _generateConfig?: (inputs: WizardInputs) => string;
  _generatePassword?: () => string;
  _saveCredentials?: (
    credentials: Record<string, string>,
    profile: string
  ) => void;
  _testSshConnection?: (
    host: string,
    user: string,
    sshKey: string
  ) => Promise<boolean>;
  _writeFile?: (path: string, content: string) => void;
}

type Step =
  | 'target_mode'
  | 'ssh_string'
  | 'ssh_key'
  | 'ssh_testing'
  | 'ssh_error'
  | 'cloudflare_gate'
  | 'domain'
  | 'account_id'
  | 'zone_id'
  | 'api_token'
  | 'done';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_32_REGEX = /^[0-9a-f]{32}$/i;

const TARGET_MODE_OPTIONS: SelectItem[] = [
  { label: 'localhost  (this machine)', value: 'local' },
  { label: 'remote     (SSH to another device)', value: 'remote' },
];

const CLOUDFLARE_OPTIONS: SelectItem[] = [
  {
    label: 'No   (local ports only — access via LAN or SSH tunnel)',
    value: 'no',
  },
  { label: 'Yes  (public HTTPS at your domain)', value: 'yes' },
];

// ---------------------------------------------------------------------------
// Default SSH tester (same logic as TargetInitWizard)
// ---------------------------------------------------------------------------

async function defaultTestSshConnection(
  host: string,
  user: string,
  sshKey: string
): Promise<boolean> {
  const { spawnSync } = await import('child_process');
  const result = spawnSync(
    'ssh',
    [
      '-i',
      sshKey,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      `${user}@${host}`,
      'echo ok',
    ],
    { encoding: 'utf-8' }
  );
  return result.status === 0;
}

function defaultWriteFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InitWizard({
  profile,
  output,
  _SelectInput = RealSelectInput,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
  _generateConfig = generateConfig,
  _generatePassword = generatePassword,
  _saveCredentials = saveCredentials,
  _testSshConnection = defaultTestSshConnection,
  _writeFile = defaultWriteFile,
}: InitWizardProps) {
  const { exit } = useApp();

  // --- state ---
  const [step, setStep] = useState<Step>('target_mode');
  const [targetMode, setTargetMode] = useState<'local' | 'remote'>('local');
  const [connectionString, setConnectionString] = useState('');
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState('');
  const [sshKey, setSshKey] = useState('');
  const [cloudflareEnabled, setCloudflareEnabled] = useState(false);
  const [domain, setDomain] = useState('');
  const [accountId, setAccountId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [grafanaPassword, setGrafanaPassword] = useState('');

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingTest, setPendingTest] = useState(false);
  const [sshFailed, setSshFailed] = useState(false);

  const InputComponent = _TextInput;
  const SelectComponent = _SelectInput as unknown as (
    props: SelectInputProps
  ) => null;

  // --- SSH connection test effect ---
  useEffect(() => {
    if (!pendingTest) return;
    let cancelled = false;

    const run = async () => {
      const success = await _testSshConnection(sshHost, sshUser, sshKey);
      if (cancelled) return;
      setPendingTest(false);
      if (success) {
        setStep('cloudflare_gate');
      } else {
        setSshFailed(true);
        setStep('ssh_error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pendingTest, sshHost, sshUser, sshKey, _testSshConnection]);

  // --- Done: write config and credentials ---
  useEffect(() => {
    if (step !== 'done') return;

    const password = _generatePassword();
    setGrafanaPassword(password);

    const inputs: WizardInputs = {
      targetMode,
      sshHost: targetMode === 'remote' ? sshHost : undefined,
      sshUser: targetMode === 'remote' ? sshUser : undefined,
      sshKey: targetMode === 'remote' ? sshKey : undefined,
      cloudflareEnabled,
      domain: cloudflareEnabled ? domain : undefined,
      cloudflareAccountId: cloudflareEnabled ? accountId : undefined,
      cloudflareZoneId: cloudflareEnabled ? zoneId : undefined,
    };

    const yamlContent = _generateConfig(inputs);
    _writeFile(output, yamlContent);

    const creds: Record<string, string> = {
      grafana_admin_password: password,
    };
    if (cloudflareEnabled && apiToken) {
      creds.cloudflare_api_token = apiToken;
    }
    _saveCredentials(creds, profile);

    const timer = setTimeout(() => exit(), 500);
    return () => clearTimeout(timer);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  const header = (
    <>
      <Text bold color="cyan">
        {'┌  IaC-Toolbox — Observability Setup'}
      </Text>
      <Text bold>{'│'}</Text>
    </>
  );

  // ---------------------------------------------------------------------------
  // Step: target_mode
  // ---------------------------------------------------------------------------

  if (step === 'target_mode') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text bold>{'◆  Where do you want to install?'}</Text>
        <Box paddingLeft={3} marginTop={1}>
          <SelectComponent
            items={TARGET_MODE_OPTIONS}
            onSelect={(item: SelectItem) => {
              if (item.value === 'local') {
                setTargetMode('local');
                setStep('cloudflare_gate');
              } else {
                setTargetMode('remote');
                setInputValue('');
                setStep('ssh_string');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: ssh_string
  // ---------------------------------------------------------------------------

  if (step === 'ssh_string') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  SSH connection string'}</Text>
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
              if (!trimmed.includes('@')) {
                setError(
                  'Invalid format — expected user@host (e.g. pi@192.168.1.50)'
                );
                return;
              }
              const atIdx = trimmed.indexOf('@');
              const parsedUser = trimmed.substring(0, atIdx).trim();
              const parsedHost = trimmed.substring(atIdx + 1).trim();
              if (!parsedUser || !parsedHost) {
                setError(
                  'Invalid format — expected user@host (e.g. pi@192.168.1.50)'
                );
                return;
              }
              setSshUser(parsedUser);
              setSshHost(parsedHost);
              setConnectionString(trimmed);
              setError(null);
              setInputValue('~/.ssh/id_ed25519');
              setStep('ssh_key');
            }}
            placeholder="user@remote_ip"
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: ssh_key
  // ---------------------------------------------------------------------------

  if (step === 'ssh_key') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  SSH private key path'}</Text>
        {sshFailed && (
          <>
            <Box paddingLeft={3}>
              <Text color="red">{'✗ SSH connection failed'}</Text>
            </Box>
            <Box paddingLeft={3}>
              <Text>
                {'Could not reach '}
                {connectionString}
                {' with '}
                {sshKey}
              </Text>
            </Box>
            <Box paddingLeft={3}>
              <Text>
                {'Check that the host is reachable and the key is loaded.'}
              </Text>
            </Box>
          </>
        )}
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
                setError('SSH key path must not be empty');
                return;
              }
              setSshKey(trimmed);
              setSshFailed(false);
              setError(null);
              setPendingTest(true);
              setStep('ssh_testing');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: ssh_testing
  // ---------------------------------------------------------------------------

  if (step === 'ssh_testing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text bold>{'│'}</Text>
        <Text>
          {'◜  Pinging '}
          {connectionString}
          {'...'}
        </Text>
        <Text dimColor>{'│  (this may take up to 10 seconds)'}</Text>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: ssh_error — re-opens key field prefilled
  // ---------------------------------------------------------------------------

  if (step === 'ssh_error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>{'◇  Target: remote'}</Text>
        <Text dimColor>
          {'◇  Connection: '}
          {connectionString}
        </Text>
        <Text bold>{'│'}</Text>
        <Box paddingLeft={3}>
          <Text color="red">{'✗ SSH connection failed'}</Text>
        </Box>
        <Box paddingLeft={3}>
          <Text>
            {'Could not reach '}
            {connectionString}
            {' with '}
            {sshKey}
          </Text>
        </Box>
        <Box paddingLeft={3}>
          <Text>
            {'Check that the host is reachable and the key is loaded.'}
          </Text>
        </Box>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  SSH private key path'}</Text>
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={sshKey}
            onChange={(val) => {
              setSshKey(val);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) return;
              setSshKey(trimmed);
              setSshFailed(false);
              setPendingTest(true);
              setStep('ssh_testing');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: cloudflare_gate
  // ---------------------------------------------------------------------------

  if (step === 'cloudflare_gate') {
    const targetBreadcrumb =
      targetMode === 'remote' ? `remote  ${connectionString}` : 'localhost';

    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>
          {'◇  Target: '}
          {targetBreadcrumb}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Enable Cloudflare Tunnel for public HTTPS access?'}
        </Text>
        <Box paddingLeft={3} marginTop={1}>
          <SelectComponent
            items={CLOUDFLARE_OPTIONS}
            onSelect={(item: SelectItem) => {
              if (item.value === 'no') {
                setCloudflareEnabled(false);
                setStep('done');
              } else {
                setCloudflareEnabled(true);
                setInputValue('');
                setStep('domain');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: domain
  // ---------------------------------------------------------------------------

  if (step === 'domain') {
    const targetBreadcrumb =
      targetMode === 'remote' ? `remote  ${connectionString}` : 'localhost';

    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>
          {'◇  Target: '}
          {targetBreadcrumb}
        </Text>
        <Text dimColor>{'◇  Cloudflare: enabled'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Your domain (e.g. example.com)'}</Text>
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
              if (!trimmed || !trimmed.includes('.')) {
                setError(
                  'Domain must not be empty and must contain at least one dot'
                );
                return;
              }
              setDomain(trimmed);
              setError(null);
              setInputValue('');
              setStep('account_id');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: account_id
  // ---------------------------------------------------------------------------

  if (step === 'account_id') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>
          {'◇  Domain: '}
          {domain}
        </Text>
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
              setInputValue('');
              setStep('zone_id');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: zone_id
  // ---------------------------------------------------------------------------

  if (step === 'zone_id') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>
          {'◇  Account ID: '}
          {accountId.substring(0, 8)}
          {'...'}
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
              setZoneId(trimmed);
              setError(null);
              setInputValue('');
              setStep('api_token');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: api_token
  // ---------------------------------------------------------------------------

  if (step === 'api_token') {
    return (
      <Box flexDirection="column" paddingY={1}>
        {header}
        <Text dimColor>
          {'◇  Zone ID: '}
          {zoneId.substring(0, 8)}
          {'...'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Cloudflare API Token'}</Text>
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
                setError('API token must not be empty');
                return;
              }
              setApiToken(trimmed);
              setError(null);
              setStep('done');
            }}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Step: done
  // ---------------------------------------------------------------------------

  const isRemote = targetMode === 'remote';
  const cfDisabled = !cloudflareEnabled;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        {'┌  IaC-Toolbox — Observability Setup'}
      </Text>
      <Text bold>{'│'}</Text>
      {isRemote && (
        <Text dimColor>
          {'◇  Target: remote  '}
          {connectionString}
        </Text>
      )}
      {!isRemote && <Text dimColor>{'◇  Target: localhost'}</Text>}
      <Text dimColor>
        {'◇  Cloudflare: '}
        {cloudflareEnabled ? 'enabled' : 'disabled'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text dimColor>{'◇  Configuration saved'}</Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Written to '}
        {output}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  Grafana admin password: '}
        {grafanaPassword}
      </Text>
      <Text dimColor>
        {
          '│  (also stored in ~/.iac-toolbox/credentials — retrievable any time)'
        }
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  After apply, your stack will be available at:'}</Text>
      {isRemote && cfDisabled && (
        <>
          <Text>
            {'│    Node Exporter    http://'}
            {sshHost}
            {':9100'}
          </Text>
          <Text>
            {'│    Grafana Alloy    http://'}
            {sshHost}
            {':12345'}
          </Text>
          <Text>
            {'│    Prometheus       http://'}
            {sshHost}
            {':9090'}
          </Text>
          <Text>
            {'│    cAdvisor         http://'}
            {sshHost}
            {':8080'}
          </Text>
          <Text>
            {'│    Grafana          http://'}
            {sshHost}
            {':3000'}
          </Text>
          <Text bold>{'│'}</Text>
          <Text>{'│  SSH tunnel shortcut (access from your laptop):'}</Text>
          <Text>{'│    ssh -L 3000:localhost:3000 \\'}</Text>
          <Text>{'│        -L 9090:localhost:9090 \\'}</Text>
          <Text>{'│        -L 12345:localhost:12345 \\'}</Text>
          <Text>
            {'│        '}
            {connectionString}
          </Text>
        </>
      )}
      {!isRemote && cfDisabled && (
        <>
          <Text>{'│    Node Exporter    http://localhost:9100'}</Text>
          <Text>{'│    Grafana Alloy    http://localhost:12345'}</Text>
          <Text>{'│    Prometheus       http://localhost:9090'}</Text>
          <Text>{'│    cAdvisor         http://localhost:8080'}</Text>
          <Text>{'│    Grafana          http://localhost:3000'}</Text>
        </>
      )}
      {cloudflareEnabled && domain && (
        <>
          {isRemote && (
            <>
              <Text>
                {'│    Node Exporter    http://'}
                {sshHost}
                {':9100     (host service)'}
              </Text>
              <Text>
                {'│    Grafana Alloy    http://'}
                {sshHost}
                {':12345    (pipeline UI)'}
              </Text>
            </>
          )}
          {!isRemote && (
            <>
              <Text>
                {
                  '│    Node Exporter    http://localhost:9100     (host service)'
                }
              </Text>
              <Text>
                {
                  '│    Grafana Alloy    http://localhost:12345    (pipeline UI)'
                }
              </Text>
            </>
          )}
          <Text>
            {'│    Prometheus       https://prometheus.'}
            {domain}
          </Text>
          <Text>
            {isRemote
              ? `│    cAdvisor         http://${sshHost}:8080     (LAN only)`
              : '│    cAdvisor         http://localhost:8080     (LAN only)'}
          </Text>
          <Text>
            {'│    Grafana          https://grafana.'}
            {domain}
          </Text>
        </>
      )}
      <Text bold>{'│'}</Text>
      <Text dimColor>{'│  ℹ  Run to install:'}</Text>
      <Text>
        {'│     iac-toolbox platform apply --filePath='}
        {output}
      </Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { TextInputProps };
