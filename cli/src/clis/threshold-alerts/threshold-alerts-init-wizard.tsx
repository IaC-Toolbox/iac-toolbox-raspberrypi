import { Box, Text, useApp, useInput } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState, useEffect } from 'react';
import {
  updateThresholdAlertsConfig,
  loadThresholdAlertsEnabled,
  loadThresholdAlertsTerraformDest,
  updateThresholdAlertsTerraformDest,
} from './threshold-alerts-config.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

interface ThresholdAlertsInitWizardProps {
  destination: string;
  /** Injectable for testing */
  _onConfirm?: (enabled: boolean, terraformDest: string) => void;
  /** Injectable for testing */
  _TextInput?: (props: TextInputProps) => null;
}

type Choice = 'yes' | 'no';
type Step = 'choose' | 'terraform-dest' | 'done';

export default function ThresholdAlertsInitWizard({
  destination,
  _onConfirm,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
}: ThresholdAlertsInitWizardProps) {
  const { exit } = useApp();

  const existingEnabled = loadThresholdAlertsEnabled(destination);
  const defaultChoice: Choice = existingEnabled === false ? 'no' : 'yes';
  const existingTerraformDest =
    loadThresholdAlertsTerraformDest(destination) ?? './infrastructure';

  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Choice>(defaultChoice);
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
        setStep('terraform-dest');
      } else {
        setStep('done');
      }
    }
  });

  useEffect(() => {
    if (step === 'done') {
      const enabled = selected === 'yes';
      if (_onConfirm) {
        _onConfirm(enabled, terraformDest);
      } else {
        updateThresholdAlertsConfig(destination, enabled);
        if (enabled) {
          updateThresholdAlertsTerraformDest(destination, terraformDest);
        }
      }
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, selected, terraformDest, destination, exit, _onConfirm]);

  if (step === 'choose') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Threshold Alerts Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Enable Grafana threshold alerts on this device?'}</Text>
        <Text>
          {'│  Fires when disk, memory, or containers cross health thresholds.'}
        </Text>
        <Text bold>{'│'}</Text>
        <Box paddingLeft={3} flexDirection="column">
          <Text color={selected === 'yes' ? 'cyan' : undefined}>
            {selected === 'yes' ? '◉' : '◯'}
            {'  Yes — enable threshold alerts'}
          </Text>
          <Text color={selected === 'no' ? 'cyan' : undefined}>
            {selected === 'no' ? '◉' : '◯'}
            {'  No  — skip threshold alerts'}
          </Text>
        </Box>
        <Text bold>{'└'}</Text>
      </Box>
    );
  }

  if (step === 'terraform-dest') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {'┌  IaC-Toolbox — Threshold Alerts Setup'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text dimColor>
          {'◇  Enable threshold alerts: yes'}
        </Text>
        <Text bold>{'│'}</Text>
        <Text bold>{'◆  Where should Terraform alert files be rendered?'}</Text>
        <Text>
          {'│  Path is used as the base — /terraform/grafana-alerts is appended.'}
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
        {'◇  Threshold alerts configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  enabled               '}
        {String(enabled)}
        {'    → iac-toolbox.yml'}
      </Text>
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
      <Text bold>{'│     iac-toolbox threshold-alerts install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { ThresholdAlertsInitWizardProps, TextInputProps };
