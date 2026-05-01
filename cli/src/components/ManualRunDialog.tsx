import { Box, Text } from 'ink';
import {
  getManualRunCommand,
  getRequiredEnvVars,
} from '../utils/installRunner.js';

interface ManualRunDialogProps {
  destination: string;
}

/**
 * Shown when the user declines to install immediately.
 * Displays the equivalent bash command and required environment variables.
 */
export default function ManualRunDialog({ destination }: ManualRunDialogProps) {
  const command = getManualRunCommand(destination);
  const envVars = getRequiredEnvVars();

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>{'◆ Skipping install'}</Text>
      <Text>{'│'}</Text>
      <Text>{'│ To install manually, run:'}</Text>
      <Text>{'│'}</Text>
      <Text>
        {'│   '}
        {command}
      </Text>
      <Text>{'│'}</Text>
      <Text>
        {'│ Ensure the following environment variables are set before running:'}
      </Text>
      <Text>
        {'│ '}
        {envVars.join(', ')}
      </Text>
      <Text>{'└'}</Text>
    </Box>
  );
}
