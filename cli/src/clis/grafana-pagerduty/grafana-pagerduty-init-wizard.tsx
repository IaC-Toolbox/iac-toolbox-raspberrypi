import { Box, Text, useApp, useInput } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  loadGrafanaPagerdutyConfig,
  updateGrafanaPagerdutyConfig,
  saveGrafanaPagerdutyToken,
} from './grafana-pagerduty-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface GrafanaPagerdutyInitWizardProps {
  destination: string;
  profile?: string;
  filePath?: string;
  onComplete?: () => void;
  /** Injectable for testing */
  _onConfirm?: (
    enabled: boolean,
    token: string,
    serviceRegion: string,
    serviceName: string,
    terraformDest: string
  ) => void;
  /** Injectable for testing */
  _TextInput?: (props: TextInputProps) => null;
}

type Choice = 'yes' | 'no';
type Step =
  | 'choose'
  | 'token'
  | 'region'
  | 'service-name'
  | 'terraform-dest'
  | 'done';
type Region = 'eu' | 'us';

export default function GrafanaPagerdutyInitWizard({
  destination,
  profile = 'default',
  filePath,
  onComplete,
  _onConfirm,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
}: GrafanaPagerdutyInitWizardProps) {
  const { exit } = useApp();

  const existing = loadGrafanaPagerdutyConfig(destination, filePath);
  const defaultChoice: Choice = existing?.enabled === false ? 'no' : 'yes';
  const existingRegion =
    (existing?.service_region as Region | undefined) ?? 'eu';
  const existingServiceName =
    existing?.service_name ?? 'Infrastructure-Monitoring';
  const existingTerraformDest = existing?.terraform_dest ?? './infrastructure';

  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Choice>(defaultChoice);
  const [selectedRegion, setSelectedRegion] = useState<Region>(existingRegion);
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState(existingServiceName);
  const [serviceNameInput, setServiceNameInput] = useState(existingServiceName);
  const [serviceNameError, setServiceNameError] = useState<string | null>(null);
  const [terraformDest, setTerraformDest] = useState(existingTerraformDest);
  const [terraformDestInput, setTerraformDestInput] = useState(
    existingTerraformDest
  );
  const [terraformDestError, setTerraformDestError] = useState<string | null>(
    null
  );

  const InputComponent = _TextInput;

  useInput((input, key) => {
    if (step === 'choose') {
      if (key.upArrow || input === 'k') {
        setSelected('yes');
      } else if (key.downArrow || input === 'j') {
        setSelected('no');
      } else if (key.return) {
        if (selected === 'yes') {
          setStep('token');
        } else {
          setStep('done');
        }
      }
    } else if (step === 'region') {
      if (key.upArrow || input === 'k') {
        setSelectedRegion('eu');
      } else if (key.downArrow || input === 'j') {
        setSelectedRegion('us');
      } else if (key.return) {
        setStep('service-name');
      }
    }
  });

  useEffect(() => {
    if (step === 'done') {
      const enabled = selected === 'yes';
      if (_onConfirm) {
        _onConfirm(enabled, token, selectedRegion, serviceName, terraformDest);
      } else {
        updateGrafanaPagerdutyConfig(
          destination,
          enabled,
          selectedRegion,
          serviceName,
          terraformDest,
          filePath
        );
        if (enabled && token) {
          saveGrafanaPagerdutyToken(token, profile);
        }
      }
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    selected,
    token,
    selectedRegion,
    serviceName,
    terraformDest,
    destination,
    filePath,
    profile,
    exit,
    onComplete,
    _onConfirm,
  ]);

  if (step === 'choose') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana-PagerDuty Integration Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>
          {'◆  Enable Grafana → PagerDuty alerting integration?'}
        </Text>
        <Text>
          {
            '│  Routes firing alerts to PagerDuty via contact point + notification policy.'
          }
        </Text>
        <Text bold>{'│'}</Text>
        <Box paddingLeft={3} flexDirection="column">
          <Text color={selected === 'yes' ? 'cyan' : undefined}>
            {selected === 'yes' ? '◉' : '◯'}
            {'  Yes — enable Grafana-PagerDuty integration'}
          </Text>
          <Text color={selected === 'no' ? 'cyan' : undefined}>
            {selected === 'no' ? '◉' : '◯'}
            {'  No  — skip this integration'}
          </Text>
        </Box>
        <Text bold>{'└'}</Text>
      </Box>
    );
  }

  if (step === 'token') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana-PagerDuty Integration Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable Grafana-PagerDuty integration: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  PagerDuty API token'}</Text>
        <Text>
          {'│  Navigate to Integrations → API Access Keys → Create API Key.'}
        </Text>
        {tokenError && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {tokenError}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={tokenInput}
            onChange={(val) => {
              setTokenInput(val);
              setTokenError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setTokenError('API token must not be empty');
                return;
              }
              setToken(trimmed);
              setTokenError(null);
              setStep('region');
            }}
            mask="•"
          />
        </Box>
      </Box>
    );
  }

  if (step === 'region') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana-PagerDuty Integration Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable Grafana-PagerDuty integration: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty API token: saved to credentials store'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  PagerDuty service region'}</Text>
        <Text>
          {'│  Check your URL: eu.pagerduty.com → eu, otherwise → us.'}
        </Text>
        <Text bold>{'│'}</Text>
        <Box paddingLeft={3} flexDirection="column">
          <Text color={selectedRegion === 'eu' ? 'cyan' : undefined}>
            {selectedRegion === 'eu' ? '◉' : '◯'}
            {'  eu'}
          </Text>
          <Text color={selectedRegion === 'us' ? 'cyan' : undefined}>
            {selectedRegion === 'us' ? '◉' : '◯'}
            {'  us'}
          </Text>
        </Box>
        <Text bold>{'└'}</Text>
      </Box>
    );
  }

  if (step === 'service-name') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana-PagerDuty Integration Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable Grafana-PagerDuty integration: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty API token: saved to credentials store'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty service region: '}
          {selectedRegion}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  PagerDuty service name'}</Text>
        <Text>
          {
            '│  Name of the service to create (no spaces — spaces cause PagerDuty routing issues).'
          }
        </Text>
        {serviceNameError && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {serviceNameError}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={serviceNameInput}
            onChange={(val) => {
              setServiceNameInput(val);
              setServiceNameError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setServiceNameError('Service name must not be empty');
                return;
              }
              setServiceName(trimmed);
              setServiceNameError(null);
              setStep('terraform-dest');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'terraform-dest') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Grafana-PagerDuty Integration Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable Grafana-PagerDuty integration: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty API token: saved to credentials store'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty service region: '}
          {selectedRegion}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  PagerDuty service name: '}
          {serviceName}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Where should Terraform alert files be rendered?'}</Text>
        <Text>
          {
            '│  Path is used as the base — /terraform/grafana-pagerduty is appended.'
          }
        </Text>
        {terraformDestError && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {terraformDestError}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={terraformDestInput}
            onChange={(val) => {
              setTerraformDestInput(val);
              setTerraformDestError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setTerraformDestError('Path must not be empty');
                return;
              }
              setTerraformDest(trimmed);
              setTerraformDestError(null);
              setStep('done');
            }}
          />
        </Box>
      </Box>
    );
  }

  // done
  const enabled = selected === 'yes';
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Grafana-PagerDuty configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  enabled              '}
        {String(enabled)}
      </Text>
      {enabled && (
        <Text>
          {'│  service_region       '}
          {selectedRegion}
        </Text>
      )}
      {enabled && (
        <Text>
          {'│  service_name         '}
          {serviceName}
        </Text>
      )}
      {enabled && (
        <Text>
          {'│  terraform dest       '}
          {terraformDest}
        </Text>
      )}
      {enabled && (
        <Text>{'│  token                saved to credentials store'}</Text>
      )}
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To render Terraform templates, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox grafana-pagerduty install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { GrafanaPagerdutyInitWizardProps, TextInputProps };
