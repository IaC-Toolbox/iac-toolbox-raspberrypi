import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export type DeviceProfile = 'devops-server' | 'app-server' | 'both';

interface DeviceProfileDialogProps {
  onSelect: (profile: DeviceProfile) => void;
}

const PROFILES = [
  {
    label: 'DevOps Server (CI runner, secrets, observability)',
    value: 'devops-server',
  },
  { label: 'App Server (deploy and run applications)', value: 'app-server' },
  { label: 'Both', value: 'both' },
];

export const PROFILE_DEFAULTS: Record<DeviceProfile, string[]> = {
  'devops-server': [
    'github_runner',
    'cloudflare',
    'vault',
    'grafana',
    'prometheus',
    'loki',
  ],
  'app-server': ['github_build_workflow', 'cloudflare'],
  both: [],
};

export default function DeviceProfileDialog({
  onSelect,
}: DeviceProfileDialogProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ What is this device for?</Text>
      <Box paddingLeft={3}>
        <SelectInput
          items={PROFILES}
          onSelect={(item) => onSelect(item.value as DeviceProfile)}
        />
      </Box>
    </Box>
  );
}
