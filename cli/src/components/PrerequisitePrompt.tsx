import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useState } from 'react';
import PrerequisiteInstaller from './PrerequisiteInstaller.js';
import type { PrerequisiteStatus } from '../types/config.js';

interface Props {
  onComplete: (status: PrerequisiteStatus) => void;
}

type InstallOption = 'yes' | 'already-installed' | 'skip';

interface SelectOption {
  label: string;
  value: InstallOption;
}

export default function PrerequisitePrompt({ onComplete }: Props) {
  const [step, setStep] = useState<'ansible' | 'terraform' | 'installing'>(
    'ansible'
  );
  const [ansibleOption, setAnsibleOption] = useState<InstallOption | null>(
    null
  );
  const [terraformOption, setTerraformOption] = useState<InstallOption | null>(
    null
  );

  const ansibleOptions: SelectOption[] = [
    { label: 'Yes (will install via brew/pip)', value: 'yes' },
    { label: 'Already installed', value: 'already-installed' },
    { label: 'Skip (manual installation required)', value: 'skip' },
  ];

  const terraformOptions: SelectOption[] = [
    { label: 'Yes (will install via brew/tfenv)', value: 'yes' },
    { label: 'Already installed', value: 'already-installed' },
    { label: 'Skip (no Grafana alerts)', value: 'skip' },
  ];

  const handleAnsibleSelect = (item: SelectOption) => {
    setAnsibleOption(item.value);
    setStep('terraform');
  };

  const handleTerraformSelect = (item: SelectOption) => {
    setTerraformOption(item.value);
    setStep('installing');
  };

  if (step === 'installing' && ansibleOption && terraformOption) {
    return (
      <Box flexDirection="column">
        <PrerequisiteInstaller
          onComplete={onComplete}
          installAnsibleOption={ansibleOption}
          installTerraformOption={terraformOption}
        />
      </Box>
    );
  }

  if (step === 'terraform') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text>◆ Install Terraform?</Text>
        <Text dimColor> (Required for Grafana alerts)</Text>
        <SelectInput
          items={terraformOptions}
          onSelect={handleTerraformSelect}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text>◆ Install Ansible?</Text>
      <Text dimColor> (Required for infrastructure automation)</Text>
      <SelectInput items={ansibleOptions} onSelect={handleAnsibleSelect} />
    </Box>
  );
}
