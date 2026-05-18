import { Box, Text, useApp, useInput } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  updateContainerMetricsAlertsConfig,
  loadContainerMetricsAlertsEnabled,
  loadContainerMetricsAlertsServiceName,
  updateContainerMetricsAlertsServiceName,
  loadContainerMetricsAlertsTerraformDest,
  updateContainerMetricsAlertsTerraformDest,
} from './container-metrics-alerts-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

interface ContainerMetricsAlertsInitWizardProps {
  destination: string;
  /** Injectable for testing */
  _onConfirm?: (
    enabled: boolean,
    serviceName: string,
    terraformDest: string
  ) => void;
  /** Injectable for testing */
  _TextInput?: (props: TextInputProps) => null;
}

type Choice = 'yes' | 'no';
type Step = 'choose' | 'service-name' | 'terraform-dest' | 'done';

export default function ContainerMetricsAlertsInitWizard({
  destination,
  _onConfirm,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
}: ContainerMetricsAlertsInitWizardProps) {
  const { exit } = useApp();

  const existingEnabled = loadContainerMetricsAlertsEnabled(destination);
  const defaultChoice: Choice = existingEnabled === false ? 'no' : 'yes';
  const existingServiceName =
    loadContainerMetricsAlertsServiceName(destination) ?? 'my-service';
  const existingTerraformDest =
    loadContainerMetricsAlertsTerraformDest(destination) ??
    './infrastructure/terraform/container-alerts';

  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Choice>(defaultChoice);
  const [serviceName, setServiceName] = useState(existingServiceName);
  const [serviceNameInput, setServiceNameInput] = useState(existingServiceName);
  const [serviceNameError, setServiceNameError] = useState<string | null>(null);
  const [terraformDest, setTerraformDest] = useState(existingTerraformDest);
  const [inputValue, setInputValue] = useState(existingTerraformDest);
  const [inputError, setInputError] = useState<string | null>(null);

  const InputComponent = _TextInput;

  useInput((input, key) => {
    if (step !== 'choose') return;

    if (key.upArrow || input === 'k') {
      setSelected('yes');
    } else if (key.downArrow || input === 'j') {
      setSelected('no');
    } else if (key.return) {
      if (selected === 'yes') {
        setStep('service-name');
      } else {
        setStep('done');
      }
    }
  });

  useEffect(() => {
    if (step === 'done') {
      const enabled = selected === 'yes';
      if (_onConfirm) {
        _onConfirm(enabled, serviceName, terraformDest);
      } else {
        updateContainerMetricsAlertsConfig(destination, enabled);
        if (enabled) {
          updateContainerMetricsAlertsServiceName(destination, serviceName);
          updateContainerMetricsAlertsTerraformDest(destination, terraformDest);
        }
      }
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    selected,
    serviceName,
    terraformDest,
    destination,
    exit,
    _onConfirm,
  ]);

  if (step === 'choose') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Container Metrics Alerts Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Enable container metrics alerts?'}</Text>
        <Text>
          {
            '│  Fires when a container restarts, OOMs, or exceeds resource thresholds.'
          }
        </Text>
        <Text bold>{'│'}</Text>
        <Box paddingLeft={3} flexDirection="column">
          <Text color={selected === 'yes' ? 'cyan' : undefined}>
            {selected === 'yes' ? '◉' : '◯'}
            {'  Yes — set up container-level alerts for a service'}
          </Text>
          <Text color={selected === 'no' ? 'cyan' : undefined}>
            {selected === 'no' ? '◉' : '◯'}
            {'  No  — skip'}
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
          {'┌  IaC-Toolbox — Container Metrics Alerts Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable container metrics alerts: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Service name (container name in cAdvisor)'}</Text>
        <Text>
          {'│  Used to scope alert expressions to a single container.'}
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
          {'┌  IaC-Toolbox — Container Metrics Alerts Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>{'◇  Enable container metrics alerts: yes'}</Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Service name: '}
          {serviceName}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Terraform destination'}</Text>
        <Text>
          {'│  Base directory where alert templates will be rendered.'}
        </Text>
        {inputError && (
          <Box paddingLeft={3}>
            <Text color="red">
              {'✗ '}
              {inputError}
            </Text>
          </Box>
        )}
        <Box paddingLeft={3} marginTop={1}>
          <Text>{'› '}</Text>
          <InputComponent
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setInputError(null);
            }}
            onSubmit={(val) => {
              const trimmed = val.trim();
              if (!trimmed) {
                setInputError('Path must not be empty');
                return;
              }
              setTerraformDest(trimmed);
              setInputError(null);
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
        {'◇  Container metrics alerts configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  enabled               '}
        {String(enabled)}
        {'    → iac-toolbox.yml'}
      </Text>
      {enabled && (
        <Text>
          {'│  service_name          '}
          {serviceName}
          {'    → iac-toolbox.yml'}
        </Text>
      )}
      {enabled && (
        <Text>
          {'│  terraform destination  '}
          {terraformDest}
          {'    → iac-toolbox.yml'}
        </Text>
      )}
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To copy Terraform alert templates, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox container-metrics-alerts install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { ContainerMetricsAlertsInitWizardProps, TextInputProps };
