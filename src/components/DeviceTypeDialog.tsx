import SelectDialog, { SelectOption } from './SelectDialog.js';

export type DeviceType = 'remote' | 'local';

interface DeviceTypeDialogProps {
  onSelect: (deviceType: DeviceType) => void;
}

/**
 * Device type selection dialog.
 * Allows users to choose between Raspberry Pi ARM64 (Remote) or Local x64.
 * AWS EC2 option is visible but disabled for future implementation.
 */
export default function DeviceTypeDialog({ onSelect }: DeviceTypeDialogProps) {
  const options: SelectOption[] = [
    { label: 'Raspberry Pi ARM64 (Remote)', value: 'remote' },
    { label: 'Local x64 (macOS/Linux)', value: 'local' },
    { label: 'AWS EC2 x64 - coming soon', value: 'aws', isDisabled: true },
  ];

  const handleSelect = (value: string) => {
    onSelect(value as DeviceType);
  };

  return (
    <SelectDialog
      title="Choose device type"
      options={options}
      onSelect={handleSelect}
    />
  );
}
