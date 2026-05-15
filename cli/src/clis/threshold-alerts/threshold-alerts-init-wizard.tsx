import { Box, Text, useApp, useInput } from 'ink';
import { useState, useEffect } from 'react';
import {
  updateThresholdAlertsConfig,
  loadThresholdAlertsEnabled,
} from './threshold-alerts-config.js';

interface ThresholdAlertsInitWizardProps {
  destination: string;
  /** Injectable for testing */
  _onConfirm?: (enabled: boolean) => void;
}

type Choice = 'yes' | 'no';
type Step = 'choose' | 'done';

export default function ThresholdAlertsInitWizard({
  destination,
  _onConfirm,
}: ThresholdAlertsInitWizardProps) {
  const { exit } = useApp();

  const existingEnabled = loadThresholdAlertsEnabled(destination);
  const defaultChoice: Choice = existingEnabled === false ? 'no' : 'yes';

  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Choice>(defaultChoice);

  useInput((input, key) => {
    if (step !== 'choose') return;

    if (key.upArrow || input === 'k') {
      setSelected('yes');
    } else if (key.downArrow || input === 'j') {
      setSelected('no');
    } else if (key.return) {
      setStep('done');
    }
  });

  useEffect(() => {
    if (step === 'done') {
      const enabled = selected === 'yes';
      if (_onConfirm) {
        _onConfirm(enabled);
      } else {
        updateThresholdAlertsConfig(destination, enabled);
      }
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, selected, destination, exit, _onConfirm]);

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

  // done
  const enabled = selected === 'yes';
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Threshold alerts configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  enabled    '}
        {String(enabled)}
        {'    → iac-toolbox.yml'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To copy Terraform alert templates, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox threshold-alerts install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { ThresholdAlertsInitWizardProps };
