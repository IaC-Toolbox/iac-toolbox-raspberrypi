import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useEffect, useState } from 'react';
import { downloadInfrastructureScripts } from '../utils/downloadFiles.js';

type DownloadState = 'creating' | 'downloading' | 'completed' | 'error';

interface Props {
  destination: string;
  onComplete: () => void;
}

export default function DownloadDialog({ destination, onComplete }: Props) {
  const [state, setState] = useState<DownloadState>('creating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const download = async () => {
      try {
        // Create directory phase
        setState('creating');
        await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay for UX

        // Download files phase
        setState('downloading');
        await downloadInfrastructureScripts(destination);

        // Complete
        setState('completed');
        setTimeout(onComplete, 1000);
      } catch (err) {
        setError((err as Error).message);
        setState('error');
      }
    };

    download();
  }, [destination, onComplete]);

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text>◇ Downloading infrastructure scripts...</Text>
        <Text color="red">│ ✗ Error: {error}</Text>
        <Text>└</Text>
      </Box>
    );
  }

  if (state === 'completed') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text>◆ Downloading infrastructure scripts...</Text>
        <Text dimColor>│ Cloning IaC-Toolbox Raspberry Pi templates</Text>
        <Text>│ ● Creating directory...</Text>
        <Text>│ ● Downloading files...</Text>
        <Text>│ ● Completed</Text>
        <Text>│</Text>
        <Text>◆ Scripts installed successfully</Text>
        <Text dimColor>│ Files saved to {destination}</Text>
        <Text>└</Text>
      </Box>
    );
  }

  const creatingDone = state !== 'creating';
  const downloadingActive = state === 'downloading';

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text>◆ Downloading infrastructure scripts...</Text>
      <Text dimColor>│ Cloning IaC-Toolbox Raspberry Pi templates</Text>
      <Text>│</Text>
      <Box>
        <Text>│ </Text>
        {!creatingDone && (
          <>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Creating directory...</Text>
          </>
        )}
        {creatingDone && <Text>● Creating directory...</Text>}
      </Box>
      {creatingDone && (
        <Box>
          <Text>│ </Text>
          {downloadingActive && (
            <>
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
              <Text> Downloading files...</Text>
            </>
          )}
          {!downloadingActive && <Text dimColor>○ Downloading files...</Text>}
        </Box>
      )}
      <Text>└</Text>
    </Box>
  );
}
