import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import {
  detectAnsible,
  detectTerraform,
  installAnsible,
  installTerraform,
} from '../utils/prerequisites.js';
import type { PrerequisiteStatus } from '../types/config.js';

interface PrerequisiteInstallerProps {
  onComplete: (status: PrerequisiteStatus) => void;
  installAnsibleOption: 'yes' | 'already-installed' | 'skip';
  installTerraformOption: 'yes' | 'already-installed' | 'skip';
}

export default function PrerequisiteInstaller({
  onComplete,
  installAnsibleOption,
  installTerraformOption,
}: PrerequisiteInstallerProps) {
  const [status, setStatus] = useState<'checking' | 'installing' | 'complete'>(
    'checking'
  );
  const [currentTask, setCurrentTask] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prerequisiteStatus, setPrerequisiteStatus] =
    useState<PrerequisiteStatus>({
      ansible: { installed: false, version: null, skipped: false },
      terraform: { installed: false, version: null, skipped: false },
    });

  useEffect(() => {
    async function processPrerequisites() {
      try {
        // Handle Ansible
        if (installAnsibleOption === 'skip') {
          setPrerequisiteStatus((prev) => ({
            ...prev,
            ansible: { installed: false, version: null, skipped: true },
          }));
        } else if (installAnsibleOption === 'already-installed') {
          setCurrentTask('Detecting Ansible...');
          const ansible = await detectAnsible();
          setPrerequisiteStatus((prev) => ({
            ...prev,
            ansible: {
              installed: ansible.isInstalled,
              version: ansible.version,
              skipped: false,
            },
          }));
        } else if (installAnsibleOption === 'yes') {
          setStatus('installing');
          setCurrentTask('Installing Ansible via brew/pip...');
          await installAnsible();
          const ansible = await detectAnsible();
          setPrerequisiteStatus((prev) => ({
            ...prev,
            ansible: {
              installed: ansible.isInstalled,
              version: ansible.version,
              skipped: false,
            },
          }));
        }

        // Handle Terraform
        if (installTerraformOption === 'skip') {
          setPrerequisiteStatus((prev) => ({
            ...prev,
            terraform: { installed: false, version: null, skipped: true },
          }));
        } else if (installTerraformOption === 'already-installed') {
          setCurrentTask('Detecting Terraform...');
          const terraform = await detectTerraform();
          setPrerequisiteStatus((prev) => ({
            ...prev,
            terraform: {
              installed: terraform.isInstalled,
              version: terraform.version,
              skipped: false,
            },
          }));
        } else if (installTerraformOption === 'yes') {
          setStatus('installing');
          setCurrentTask('Installing Terraform via brew...');
          await installTerraform();
          const terraform = await detectTerraform();
          setPrerequisiteStatus((prev) => ({
            ...prev,
            terraform: {
              installed: terraform.isInstalled,
              version: terraform.version,
              skipped: false,
            },
          }));
        }

        setStatus('complete');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }

    processPrerequisites();
  }, [installAnsibleOption, installTerraformOption]);

  useEffect(() => {
    if (status === 'complete' && !error) {
      onComplete(prerequisiteStatus);
    }
  }, [status, error, prerequisiteStatus, onComplete]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ Error: {error}</Text>
      </Box>
    );
  }

  if (status === 'complete') {
    return (
      <Box flexDirection="column">
        {prerequisiteStatus.ansible.installed && (
          <Text color="green">
            ✓ Ansible v{prerequisiteStatus.ansible.version} detected
          </Text>
        )}
        {prerequisiteStatus.ansible.skipped && (
          <Text color="yellow">⚠ Ansible installation skipped</Text>
        )}
        {prerequisiteStatus.terraform.installed && (
          <Text color="green">
            ✓ Terraform v{prerequisiteStatus.terraform.version} detected
          </Text>
        )}
        {prerequisiteStatus.terraform.skipped && (
          <Box flexDirection="column">
            <Text color="yellow">⚠ Terraform installation skipped</Text>
            <Text dimColor>Grafana alerts will not be configured</Text>
            <Text dimColor>You can add them manually later</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{currentTask}</Text>
    </Box>
  );
}
