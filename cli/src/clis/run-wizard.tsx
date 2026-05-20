import { useState } from 'react';
import { useApp } from 'ink';
import { CLI_WIZARD_MAP } from './cli-wizard-map.js';

export interface WizardContext {
  destination: string;
  filePath?: string;
  profile: string;
}

export interface WizardDescriptor {
  fn: (ctx: WizardContext, onComplete: () => void) => React.ReactElement;
}

interface WizardRunnerProps {
  cliName: string;
  ctx: WizardContext;
}

export default function WizardRunner({ cliName, ctx }: WizardRunnerProps) {
  const { exit } = useApp();
  const descriptors = CLI_WIZARD_MAP[cliName] ?? [];
  const [index, setIndex] = useState(0);

  if (descriptors.length === 0) {
    exit();
    return null;
  }

  const advance = () => {
    const next = index + 1;
    if (next >= descriptors.length) {
      exit();
    } else {
      setIndex(next);
    }
  };

  return descriptors[index].fn(ctx, advance);
}
