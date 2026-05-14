import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { useEffect, useState } from 'react';
import {
  CREDENTIAL_KEYS,
  type CredentialKey,
  type CredentialProfile,
  loadCredentials,
  saveCredentials,
  ensureGitignore,
} from '../../loaders/credentials-loader.js';
import {
  validateCredential,
  type ValidationResult,
} from './credential-validators.js';

interface CredentialPromptProps {
  /** Credential profile to use. Defaults to "default". */
  profile?: string;
  /** Called when the user finishes all credential prompts. */
  onComplete: (credentials: CredentialProfile) => void;
}

interface SelectOption {
  label: string;
  value: string;
}

type PromptPhase = 'intro' | 'prompt' | 'validating' | 'result';

const credentialKeyList = Object.keys(CREDENTIAL_KEYS) as CredentialKey[];

export default function CredentialPrompt({
  profile = 'default',
  onComplete,
}: CredentialPromptProps) {
  const [existing] = useState<CredentialProfile>(() =>
    loadCredentials(profile)
  );

  const [phase, setPhase] = useState<PromptPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collected, setCollected] = useState<CredentialProfile>({});
  const [inputValue, setInputValue] = useState('');
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  // Auto-advance after showing validation result
  useEffect(() => {
    if (phase !== 'result' || !validationResult) return;

    const timer = setTimeout(() => {
      setValidationResult(null);
      setCurrentIndex((i) => i + 1);
      setInputValue('');
      setPhase('prompt');
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, validationResult]);

  // Save credentials and signal completion when all prompts are done
  useEffect(() => {
    if (currentIndex < credentialKeyList.length) return;
    if (Object.keys(collected).length > 0) {
      saveCredentials(collected, profile);
    }
    onComplete(collected);
  }, [currentIndex, collected, profile, onComplete]);

  // Phase: intro — ask whether to configure credentials
  if (phase === 'intro') {
    const options: SelectOption[] = [
      { label: 'Yes, configure credentials', value: 'yes' },
      { label: 'Skip for now', value: 'skip' },
    ];

    const handleSelect = (item: SelectOption) => {
      if (item.value === 'skip') {
        onComplete({});
      } else {
        ensureGitignore();
        setPhase('prompt');
      }
    };

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold>◆ Configure credentials?</Text>
        <Box paddingLeft={3}>
          <Text dimColor>
            (Stored in ~/.iac-toolbox/credentials, never committed)
          </Text>
        </Box>
        <Box paddingLeft={3}>
          <SelectInput items={options} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  // All credentials collected — show done state (useEffect above handles save + onComplete)
  if (currentIndex >= credentialKeyList.length) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="green">
          ◆ Credentials saved to ~/.iac-toolbox/credentials
        </Text>
        <Box paddingLeft={3}>
          <Text dimColor>(Profile: {profile}, permissions: 600)</Text>
        </Box>
      </Box>
    );
  }

  const currentKey = credentialKeyList[currentIndex];
  const description = CREDENTIAL_KEYS[currentKey];
  const existingValue = existing[currentKey];

  // Phase: validating — show spinner
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

  // Phase: result — show validation result (useEffect above handles advance)
  if (phase === 'result' && validationResult) {
    return (
      <Box flexDirection="column" paddingY={1}>
        {validationResult.valid ? (
          <Text color="green">✔ {validationResult.message}</Text>
        ) : (
          <Text color="yellow">
            ⚠ {validationResult.message} (saved anyway)
          </Text>
        )}
      </Box>
    );
  }

  // Phase: prompt — ask for the credential value
  const handleSubmit = async (value: string) => {
    const finalValue = value.trim() || existingValue || '';

    if (!finalValue) {
      // Skip empty values — move to next credential
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
      return;
    }

    // Store the value
    setCollected({ ...collected, [currentKey]: finalValue });

    // Validate
    setPhase('validating');
    try {
      const result = await validateCredential(currentKey, finalValue);
      setValidationResult(result);
      setPhase('result');
    } catch {
      setValidationResult({
        valid: false,
        message: 'Validation failed (saved anyway)',
      });
      setPhase('result');
    }
  };

  const maskedKeys: CredentialKey[] = [
    'docker_hub_token',
    'github_pat',
    'cloudflare_tunnel_token',
    'vault_token',
    'grafana_api_key',
    'pagerduty_key',
  ];
  const shouldMask = maskedKeys.includes(currentKey);
  const displayExisting = existingValue ? '****' : 'not set';

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>
        ◆ {description} ({currentIndex + 1}/{credentialKeyList.length})
      </Text>
      <Box paddingLeft={3}>
        <Text dimColor>(Key: {currentKey})</Text>
      </Box>
      <Box paddingLeft={3}>
        <Text dimColor>(Current: {displayExisting} — press Enter to keep)</Text>
      </Box>
      <Box paddingLeft={3} marginTop={1}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          mask={shouldMask ? '*' : undefined}
        />
      </Box>
    </Box>
  );
}

export type { CredentialPromptProps };
