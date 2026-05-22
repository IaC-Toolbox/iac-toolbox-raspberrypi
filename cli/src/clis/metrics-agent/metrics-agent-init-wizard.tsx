import { Box, Text, useApp } from 'ink';
import { useEffect } from 'react';
import { updateMetricsAgentConfig } from './metrics-agent-config.js';

interface MetricsAgentInitWizardProps {
  destination: string;
  filePath?: string;
  onComplete?: () => void;
  /** Injectable for testing */
  _updateMetricsAgentConfig?: (destination: string, filePath?: string) => void;
}

export default function MetricsAgentInitWizard({
  destination,
  filePath,
  onComplete,
  _updateMetricsAgentConfig = updateMetricsAgentConfig,
}: MetricsAgentInitWizardProps) {
  const { exit } = useApp();

  useEffect(() => {
    _updateMetricsAgentConfig(destination, filePath);
    // Give Ink time to render final screen
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        exit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [destination, filePath, exit, onComplete, _updateMetricsAgentConfig]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇  Metrics agent configuration saved'}
      </Text>
      <Text bold>{'│'}</Text>
      <Text>
        {'│  grafana_alloy.enabled = true    → '}
        {filePath ?? 'iac-toolbox.yml'}
      </Text>
      <Text>{'│  node_exporter.enabled = true'}</Text>
      <Text>{'│  cadvisor.enabled = true'}</Text>
      <Text bold>{'│'}</Text>
      <Text>
        {
          '│  remote_write URL is derived from prometheus.domain at Ansible play time'
        }
      </Text>
      <Text bold>{'│'}</Text>
      <Text>{'│  ℹ  To install the metrics agent, run:'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'│     iac-toolbox metrics-agent install'}</Text>
      <Text bold>{'│'}</Text>
      <Text bold>{'└'}</Text>
    </Box>
  );
}

export type { MetricsAgentInitWizardProps };
