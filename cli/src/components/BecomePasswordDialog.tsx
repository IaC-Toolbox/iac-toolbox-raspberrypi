import { Box, Text } from 'ink';
import RealTextInput from 'ink-text-input';
import { useState } from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}

interface BecomePasswordDialogProps {
  /** Called when the user submits a non-empty password. */
  onComplete: (password: string) => void;
  /** Injectable for testing — defaults to the real TextInput from ink-text-input */
  _TextInput?: (props: TextInputProps) => null;
}

/**
 * Wizard step 9a — collect the Ansible become (sudo) password before spawning
 * the install script.
 *
 * The password is held only in React state and forwarded via the
 * ANSIBLE_BECOME_PASSWORD environment variable to the child process.
 * It is never written to disk.
 */
export default function BecomePasswordDialog({
  onComplete,
  _TextInput = RealTextInput as unknown as (props: TextInputProps) => null,
}: BecomePasswordDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (submitted: string) => {
    if (!submitted.trim()) {
      setError('Password cannot be empty');
      return;
    }
    setError(null);
    onComplete(submitted);
  };

  const InputComponent = _TextInput;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇ Configuration saved'}
      </Text>
      <Text>{'│'}</Text>
      <Text bold>{'◆ Sudo password required'}</Text>
      <Text>{'│ Ansible needs your sudo password to install packages.'}</Text>
      <Text>{'│ It will not be stored anywhere.'}</Text>
      <Text>{'│'}</Text>
      <Box>
        <Text>{'│ Password: '}</Text>
        <InputComponent
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          mask="*"
        />
      </Box>
      {error && <Text color="red">{'│ ✗ ' + error}</Text>}
      <Text>{'└'}</Text>
    </Box>
  );
}

export type { BecomePasswordDialogProps };
