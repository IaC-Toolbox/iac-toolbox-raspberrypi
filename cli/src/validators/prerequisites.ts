import { detectAnsible, detectTerraform } from '../utils/prerequisites.js';

export interface PrerequisiteValidation {
  ansible: {
    installed: boolean;
    version: string | null;
  };
  terraform: {
    installed: boolean;
    version: string | null;
  };
  allInstalled: boolean;
}

/**
 * Validates that required prerequisite tools are installed.
 * This is a non-blocking check - used for information gathering.
 *
 * @returns Validation result with installation status
 */
export async function validatePrerequisites(): Promise<PrerequisiteValidation> {
  const ansible = await detectAnsible();
  const terraform = await detectTerraform();

  return {
    ansible: {
      installed: ansible.isInstalled,
      version: ansible.version,
    },
    terraform: {
      installed: terraform.isInstalled,
      version: terraform.version,
    },
    allInstalled: ansible.isInstalled && terraform.isInstalled,
  };
}
