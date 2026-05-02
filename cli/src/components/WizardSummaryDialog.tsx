import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { getCredentialsPath } from '../utils/credentials.js';

interface WizardSummaryDialogProps {
  selectedIntegrations: string[];
  configFilePath: string;
  onConfirm: (action: 'confirm' | 'cancel') => void;
}

interface SelectOption {
  label: string;
  value: string;
}

/**
 * Summary dialog shown before writing files.
 *
 * Displays:
 * - List of selected integrations
 * - Path where iac-toolbox.yml will be written
 * - Path where credentials will be stored
 *
 * User can confirm to write files or cancel.
 */
export default function WizardSummaryDialog({
  selectedIntegrations,
  configFilePath,
  onConfirm,
}: WizardSummaryDialogProps) {
  const credentialsPath = getCredentialsPath();

  const integrationLabels: Record<string, string> = {
    github_build_workflow: 'GitHub Build Workflow',
    github_runner: 'GitHub Runner',
    cloudflare: 'Cloudflare Tunnel',
    vault: 'HashiCorp Vault',
    grafana: 'Grafana',
    pagerduty: 'PagerDuty',
  };

  const displayIntegrations = selectedIntegrations
    .map((id) => integrationLabels[id] || id)
    .join(', ');

  const options: SelectOption[] = [
    { label: 'Confirm and write files', value: 'confirm' },
    { label: 'Cancel', value: 'cancel' },
  ];

  const handleSelect = (item: SelectOption) => {
    onConfirm(item.value as 'confirm' | 'cancel');
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>{'◆ Ready to apply'}</Text>
      <Text>{'│'}</Text>
      <Text>
        {'│ '}
        <Text bold>Integrations</Text>
        {'  '}
        {displayIntegrations || 'None selected'}
      </Text>
      <Text>
        {'│ '}
        <Text bold>Config file</Text>
        {'   '}
        {configFilePath}
      </Text>
      <Text>
        {'│ '}
        <Text bold>Credentials</Text>
        {'  '}
        {credentialsPath}
      </Text>
      <Text>{'│'}</Text>
      <Box paddingLeft={3}>
        <SelectInput items={options} onSelect={handleSelect} />
      </Box>
      <Text>{'└'}</Text>
    </Box>
  );
}
