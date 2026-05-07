import { Box, Text, useApp } from 'ink';
import { useEffect } from 'react';
import { updateCAdvisorConfig } from '../utils/cadvisorConfig.js';

interface CAdvisorInitWizardProps {
  destination: string;
  /** Injectable for testing — defaults to updateCAdvisorConfig */
  _updateCAdvisorConfig?: (destination: string) => void;
}

export default function CAdvisorInitWizard({
  destination,
  _updateCAdvisorConfig = updateCAdvisorConfig,
}: CAdvisorInitWizardProps) {
  const { exit } = useApp();

  useEffect(() => {
    _updateCAdvisorConfig(destination);
    // Give Ink time to render final screen
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [destination, exit, _updateCAdvisorConfig]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        {'┌  IaC-Toolbox — cAdvisor Setup'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text bold>
        {'◆  cAdvisor will be added to your Grafana Alloy metrics pipeline.'}
      </Text>
      <Text>
        {'│  Per-container CPU, memory, network, and filesystem metrics will be'}
      </Text>
      <Text>
        {'│  available in Prometheus alongside your existing Node Exporter data.'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text bold color="green">
        {'◇  cAdvisor enabled'}
      </Text>
      <Text>{'│  cadvisor.enabled    true    → iac-toolbox.yml'}</Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install cAdvisor, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox cadvisor install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { CAdvisorInitWizardProps };
