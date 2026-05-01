import SelectDialog, { SelectOption } from './SelectDialog.js';

interface DockerConfigDialogProps {
  onSelect: (enabled: boolean) => void;
}

/**
 * Docker installation configuration dialog.
 * Simple Yes/No/Skip choice for Docker installation.
 */
export default function DockerConfigDialog({
  onSelect,
}: DockerConfigDialogProps) {
  const options: SelectOption[] = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Skip for now', value: 'skip' },
  ];

  const handleSelect = (value: string) => {
    const enabled = value === 'yes';
    onSelect(enabled);
  };

  return (
    <SelectDialog
      title="Install Docker?"
      options={options}
      onSelect={handleSelect}
    />
  );
}
