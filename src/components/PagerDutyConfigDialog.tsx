import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useState } from 'react';

interface PagerDutyConfig {
  enabled: boolean;
  token?: string;
  serviceRegion?: 'us' | 'eu';
  userEmail?: string;
  alertEmail?: string;
}

interface PagerDutyConfigDialogProps {
  existingConfig?: Partial<PagerDutyConfig>;
  onComplete: (config: PagerDutyConfig) => void;
}

type Step = 'enable' | 'token' | 'region' | 'userEmail' | 'alertEmail';

interface SelectOption {
  label: string;
  value: string;
}

/**
 * PagerDuty alerting configuration dialog.
 * Wizard flow: Enable/Skip → API Token → Region → User Email → Alert Email
 * Pre-fills from environment variables if available.
 */
export default function PagerDutyConfigDialog({
  existingConfig,
  onComplete,
}: PagerDutyConfigDialogProps) {
  const [step, setStep] = useState<Step>('enable');
  const [token, setToken] = useState(existingConfig?.token || '');
  const [serviceRegion, setServiceRegion] = useState<'us' | 'eu'>(
    existingConfig?.serviceRegion || 'us'
  );
  const [userEmail, setUserEmail] = useState(existingConfig?.userEmail || '');
  const [alertEmail, setAlertEmail] = useState(
    existingConfig?.alertEmail || ''
  );
  const [inputValue, setInputValue] = useState('');

  // Step 1: Enable or Skip
  if (step === 'enable') {
    const enableOptions: SelectOption[] = [
      { label: 'Yes', value: 'yes' },
      { label: 'Skip', value: 'skip' },
    ];

    const handleEnableSelect = (item: SelectOption) => {
      if (item.value === 'skip') {
        onComplete({ enabled: false });
      } else {
        setStep('token');
      }
    };

    return (
      <>
        <Box flexDirection="column" paddingY={1}>
          <Text bold>◆ Configure PagerDuty alerting?</Text>
          <Box paddingLeft={3}>
            <Text dimColor>(Incident management and on-call)</Text>
          </Box>
          <Box paddingLeft={3}>
            <SelectInput items={enableOptions} onSelect={handleEnableSelect} />
          </Box>
        </Box>
      </>
    );
  }

  // Step 2: API Token
  if (step === 'token') {
    const handleTokenSubmit = (value: string) => {
      const finalToken = value.trim() || token;
      setToken(finalToken);
      setInputValue('');
      setStep('region');
    };

    const displayToken = token ? '***hidden***' : 'not set';

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter PagerDuty API token</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {displayToken} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3}>
          <Text dimColor>
            (Get from: PagerDuty &gt; Integrations &gt; API Access Keys)
          </Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleTokenSubmit}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  // Step 3: Service Region
  if (step === 'region') {
    const regionOptions: SelectOption[] = [
      { label: 'US', value: 'us' },
      { label: 'EU', value: 'eu' },
    ];

    const handleRegionSelect = (item: SelectOption) => {
      setServiceRegion(item.value as 'us' | 'eu');
      setStep('userEmail');
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ PagerDuty service region</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {serviceRegion.toUpperCase()})</Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput
            items={regionOptions}
            onSelect={handleRegionSelect}
            initialIndex={serviceRegion === 'us' ? 0 : 1}
          />
        </Box>
      </Box>
    );
  }

  // Step 4: User Email
  if (step === 'userEmail') {
    const handleUserEmailSubmit = (value: string) => {
      const finalEmail = value.trim() || userEmail;
      setUserEmail(finalEmail);
      setInputValue('');
      setStep('alertEmail');
    };

    const displayEmail = userEmail || 'not set';

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter PagerDuty account email</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {displayEmail} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleUserEmailSubmit}
          />
        </Box>
      </Box>
    );
  }

  // Step 5: Alert Email (Final)
  const handleAlertEmailSubmit = (value: string) => {
    const finalAlertEmail = value.trim() || alertEmail || userEmail;
    setAlertEmail(finalAlertEmail);
    onComplete({
      enabled: true,
      token,
      serviceRegion,
      userEmail,
      alertEmail: finalAlertEmail,
    });
  };

  const displayAlertEmail = alertEmail || userEmail || 'not set';

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Enter fallback email for alerts</Text>
      <Box paddingLeft={3}>
        <Text dimColor>
          (Current: {displayAlertEmail} - press Enter to keep)
        </Text>
      </Box>
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleAlertEmailSubmit}
        />
      </Box>
    </Box>
  );
}

export type { PagerDutyConfig };
