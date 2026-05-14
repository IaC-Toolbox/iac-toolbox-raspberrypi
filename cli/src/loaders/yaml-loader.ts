import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface IacToolboxYaml {
  [key: string]: unknown;
  grafana?: {
    enabled?: boolean;
    admin_user?: string;
    admin_password?: string;
    [key: string]: unknown;
  };
}

/**
 * Resolve the path to iac-toolbox.yml.
 *
 * Priority:
 * 1. <destination>/iac-toolbox.yml
 * 2. ~/.iac-toolbox/iac-toolbox.yml
 */
export function resolveConfigPath(destination: string): string {
  const primary = path.join(destination, 'iac-toolbox.yml');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const homePath = path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.iac-toolbox',
    'iac-toolbox.yml'
  );
  if (fs.existsSync(homePath)) {
    return homePath;
  }

  // Default to primary (will be created)
  return primary;
}

/**
 * Load and parse the iac-toolbox.yml file.
 * Returns an empty object if the file does not exist.
 */
export function loadIacToolboxYaml(
  destination: string,
  filePath?: string
): IacToolboxYaml {
  const configPath = filePath ?? resolveConfigPath(destination);
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return (yaml.load(content) as IacToolboxYaml) || {};
  } catch {
    return {};
  }
}
