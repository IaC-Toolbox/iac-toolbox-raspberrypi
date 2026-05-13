import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useState, useEffect } from 'react';
import {
  CREDENTIAL_KEYS,
  type CredentialKey,
  getCredential,
  setCredential,
} from './credentials-store.js';
import {
  validateCredential,
  hasValidator,
  type ValidationResult,
} from './credential-validators.js';

interface CredentialSetDialogProps {
  credentialKey: string;
  profile: string;
}

type Phase = 'prompt' | 'validating' | 'result';

export default function CredentialSetDialog({
  credentialKey,
  profile,
}: CredentialSetDialogProps) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [inputValue, setInputValue] = useState('');
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [saved, setSaved] = useState(false);

  // Validate the key is known
  const isKnownKey = credentialKey in CREDENTIAL_KEYS;
  const description = isKnownKey
    ? CREDENTIAL_KEYS[credentialKey as CredentialKey]
    : credentialKey;
  const [existingValue] = useState(() => getCredential(credentialKey, profile));

  // Exit after showing result
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => {
        process.exit(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  if (!isKnownKey) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Unknown credential key: {credentialKey}</Text>
        <Text dimColor>
          Valid keys: {Object.keys(CREDENTIAL_KEYS).join(', ')}
        </Text>
      </Box>
    );
  }

  if (phase === 'validating') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Validating {description}...</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'result' && validationResult) {
    return (
      <Box flexDirection="column" paddingY={1}>
        {validationResult.valid ? (
          <Text color="green">✔ {validationResult.message}</Text>
        ) : (
          <Text color="yellow">⚠ {validationResult.message}</Text>
        )}
        <Text dimColor>Credential saved to profile &quot;{profile}&quot;.</Text>
      </Box>
    );
  }

  const handleSubmit = async (value: string) => {
    const finalValue = value.trim();

    if (!finalValue) {
      process.exit(0);
      return;
    }

    // Save immediately
    setCredential(credentialKey, finalValue, profile);

    // Validate if possible
    if (hasValidator(credentialKey)) {
      setPhase('validating');
      try {
        const result = await validateCredential(
          credentialKey as CredentialKey,
          finalValue
        );
        setValidationResult(result);
        setPhase('result');
        setSaved(true);
      } catch {
        setValidationResult({
          valid: false,
          message: 'Validation failed (saved anyway)',
        });
        setPhase('result');
        setSaved(true);
      }
    } else {
      setValidationResult({ valid: true, message: 'Saved' });
      setPhase('result');
      setSaved(true);
    }
  };

  const displayExisting = existingValue ? '****' : 'not set';

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>◆ Set {description}</Text>
      <Box paddingLeft={3}>
        <Text dimColor>
          (Profile: {profile}, current: {displayExisting})
        </Text>
      </Box>
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          mask="*"
        />
      </Box>
    </Box>
  );
}
