import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface Integration {
  id: string;
  label: string;
  selectable: boolean;
  hint?: string;
}

interface IntegrationSelectDialogProps {
  defaultSelected?: string[];
  onConfirm: (selectedIds: string[]) => void;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'github_build_workflow',
    label: 'GitHub Build Workflow (docker image push)',
    selectable: true,
  },
  {
    id: 'github_runner',
    label: 'GitHub Runner (convert current device into runner)',
    selectable: false,
    hint: 'coming soon',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Tunnel (expose services via secure tunnel)',
    selectable: true,
  },
  {
    id: 'vault',
    label: 'HashiCorp Vault (secrets management)',
    selectable: true,
  },
  {
    id: 'grafana',
    label: 'Grafana (dashboards and logs visualization)',
    selectable: true,
  },
  {
    id: 'prometheus',
    label: 'Prometheus (metrics collection)',
    selectable: true,
  },
  {
    id: 'loki',
    label: 'Loki (logs collection)',
    selectable: true,
  },
  {
    id: 'pagerduty',
    label: 'PagerDuty',
    selectable: false,
    hint: 'coming soon',
  },
];

/**
 * Multi-select dialog for choosing integrations to install.
 *
 * Navigation:
 * - Up/Down arrows: Move cursor (skips non-selectable items)
 * - Space: Toggle selection
 * - Enter: Confirm and proceed
 */
export default function IntegrationSelectDialog({
  defaultSelected = [],
  onConfirm,
}: IntegrationSelectDialogProps) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const validDefaults = defaultSelected.filter((id) =>
      INTEGRATIONS.some((i) => i.id === id && i.selectable)
    );
    return new Set(validDefaults);
  });

  // Find next selectable index in a given direction
  const findNextSelectable = (from: number, direction: 1 | -1): number => {
    let next = from + direction;
    while (next >= 0 && next < INTEGRATIONS.length) {
      if (INTEGRATIONS[next].selectable) {
        return next;
      }
      next += direction;
    }
    return from; // stay in place if nothing found
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => findNextSelectable(prev, -1));
    } else if (key.downArrow) {
      setCursor((prev) => findNextSelectable(prev, 1));
    } else if (input === ' ') {
      const integration = INTEGRATIONS[cursor];
      if (integration && integration.selectable) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(integration.id)) {
            next.delete(integration.id);
          } else {
            next.add(integration.id);
          }
          return next;
        });
      }
    } else if (key.return) {
      onConfirm(Array.from(selected));
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="green">
        {'◇ Scripts installed successfully'}
      </Text>
      <Text>{'│ Files saved to `/infrastructure`'}</Text>
      <Text>{'│'}</Text>
      <Text bold>{'◆ Select integrations to install'}</Text>
      <Box paddingLeft={2}>
        <Text dimColor>Use space to select, enter to confirm</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>
          Learn more: https://docs.iac-toolbox.com/integrations
        </Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column" marginTop={1}>
        {INTEGRATIONS.map((integration, index) => {
          const isSelected = selected.has(integration.id);
          const isCursor = index === cursor;

          if (!integration.selectable) {
            return (
              <Text key={integration.id} dimColor>
                {'  '}
                {'○'} {integration.label}
                {integration.hint ? ` — ${integration.hint}` : ''}
              </Text>
            );
          }

          return (
            <Text key={integration.id}>
              {isCursor ? '❯ ' : '  '}
              {isSelected ? '◉' : '○'} {integration.label}
            </Text>
          );
        })}
      </Box>
      <Text>{''}</Text>
      <Box paddingLeft={2}>
        <Text dimColor>[ Confirm: press Enter ]</Text>
      </Box>
      <Text>{'└'}</Text>
    </Box>
  );
}

export { INTEGRATIONS };
