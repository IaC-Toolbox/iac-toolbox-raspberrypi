import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import fs from 'fs';
import os from 'os';

export interface RemoteConfig {
  hostname: string;
  username: string;
  sshKeyPath: string;
}

export interface LocalConfig {
  username: string;
}

interface ConnectionDialogProps {
  mode: 'remote' | 'local';
  existingConfig?: Partial<RemoteConfig>;
  onComplete: (config: RemoteConfig | LocalConfig) => void;
}

/**
 * Connection configuration dialog.
 * For remote: collects hostname, username, SSH key path
 * For local: collects username only
 */
export default function ConnectionDialog({
  mode,
  existingConfig,
  onComplete,
}: ConnectionDialogProps) {
  const [step, setStep] = useState(0);
  const [hostname, setHostname] = useState(
    existingConfig?.hostname || 'raspberrypi.local'
  );
  const [username, setUsername] = useState(
    existingConfig?.username ||
      (mode === 'local' ? os.userInfo().username : 'pi')
  );
  const [sshKeyPath, setSshKeyPath] = useState(
    existingConfig?.sshKeyPath || '~/.ssh/id_ed25519'
  );
  const [error, setError] = useState<string | null>(null);

  const validateSshKey = (path: string): boolean => {
    const expandedPath = path.replace('~', os.homedir());
    return fs.existsSync(expandedPath);
  };

  const handleSubmit = (value: string) => {
    setError(null);

    if (mode === 'local') {
      onComplete({ username: value || username });
      return;
    }

    // Remote mode
    if (step === 0) {
      setHostname(value || hostname);
      setStep(1);
    } else if (step === 1) {
      setUsername(value || username);
      setStep(2);
    } else if (step === 2) {
      const finalPath = value || sshKeyPath;
      if (!validateSshKey(finalPath)) {
        setError(`SSH key not found: ${finalPath}`);
        return;
      }
      setSshKeyPath(finalPath);
      onComplete({ hostname, username, sshKeyPath: finalPath });
    }
  };

  const [inputValue, setInputValue] = useState('');

  if (mode === 'local') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter local username</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {username} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  // Remote mode
  if (step === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter Raspberry Pi hostname or IP</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {hostname} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  if (step === 1) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Enter SSH username</Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Current: {username} - press Enter to keep)</Text>
        </Box>
        <Box paddingLeft={3} marginTop={1}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Enter path to SSH private key</Text>
      <Box paddingLeft={3}>
        <Text dimColor>(Current: {sshKeyPath} - press Enter to keep)</Text>
      </Box>
      {error && (
        <Box paddingLeft={3}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}
