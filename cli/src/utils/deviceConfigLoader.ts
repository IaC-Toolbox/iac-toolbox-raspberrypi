import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import type {
  DeviceConfig,
  DeviceFeature,
  DeviceType,
} from '../types/deviceConfig.js';

const VALID_TYPES: DeviceType[] = ['platform', 'app_service'];

const VALID_FEATURES: DeviceFeature[] = [
  'monitoring',
  'cloudflare',
  'llm',
  'github-runner',
];

/**
 * Feature-to-roles mapping per device type.
 *
 * | Feature       | platform                 | app_service                        |
 * |---------------|--------------------------|------------------------------------|
 * | monitoring    | prometheus, grafana      | node_exporter, grafana-alloy        |
 * | cloudflare    | (not supported)          | cloudflare-tunnel-api               |
 * | llm           | (not supported)          | ollama, cadvisor                    |
 * | github-runner | (not supported)          | github-runner                       |
 */
const FEATURE_ROLE_MAP: Record<
  DeviceType,
  Partial<Record<DeviceFeature, string[]>>
> = {
  platform: {
    monitoring: ['prometheus', 'grafana'],
  },
  app_service: {
    monitoring: ['node_exporter', 'grafana-alloy'],
    cloudflare: ['cloudflare-tunnel-api'],
    llm: ['ollama', 'cadvisor'],
    'github-runner': ['github-runner'],
  },
};

/**
 * Resolve the path to the device config file.
 *
 * Resolution order:
 * 1. `explicitPath` — when provided via --filePath flag
 * 2. `./iac-toolbox.yml`  — project-local
 * 3. `~/.iac-toolbox/iac-toolbox.yml` — global default
 * 4. Throws if neither is found.
 */
export function resolveFilePath(explicitPath?: string): string {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return resolved;
  }

  // Fallback 1: project-local
  const local = path.resolve('./iac-toolbox.yml');
  if (fs.existsSync(local)) {
    return local;
  }

  // Fallback 2: global default
  const global = path.join(os.homedir(), '.iac-toolbox', 'iac-toolbox.yml');
  if (fs.existsSync(global)) {
    return global;
  }

  throw new Error(
    "No config file found. Create './iac-toolbox.yml' or run 'iac-toolbox init'."
  );
}

/**
 * Load and validate a DeviceConfig from the given YAML file path.
 *
 * Throws descriptive errors for:
 * - missing required fields
 * - invalid `type` value
 * - unsupported `feature` for the given type
 */
export function loadDeviceConfig(filePath: string): DeviceConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  let raw: unknown;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    raw = yaml.load(content);
  } catch (err) {
    throw new Error(`Failed to parse YAML at ${filePath}: ${String(err)}`);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Config at ${filePath} must be a YAML object.`);
  }

  const obj = raw as Record<string, unknown>;

  // Validate required fields
  const required = ['type', 'host', 'ssh_user', 'secrets_backend', 'features'];
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Missing required field '${field}' in ${filePath}`);
    }
  }

  const type = obj['type'];
  if (!VALID_TYPES.includes(type as DeviceType)) {
    throw new Error(
      `Invalid 'type' value '${String(type)}' in ${filePath}. Must be one of: ${VALID_TYPES.join(', ')}.`
    );
  }

  const features = obj['features'];
  if (!Array.isArray(features)) {
    throw new Error(`Field 'features' must be an array in ${filePath}`);
  }

  const deviceType = type as DeviceType;
  const supportedForType = Object.keys(
    FEATURE_ROLE_MAP[deviceType]
  ) as DeviceFeature[];

  for (const feature of features) {
    if (!VALID_FEATURES.includes(feature as DeviceFeature)) {
      throw new Error(
        `Unknown feature '${String(feature)}' in ${filePath}. Supported features: ${VALID_FEATURES.join(', ')}.`
      );
    }
    if (!supportedForType.includes(feature as DeviceFeature)) {
      throw new Error(
        `Feature '${String(feature)}' is not supported for type '${deviceType}'. Supported features for ${deviceType}: ${supportedForType.join(', ')}.`
      );
    }
  }

  return {
    type: deviceType,
    host: String(obj['host']),
    ssh_user: String(obj['ssh_user']),
    secrets_backend: String(
      obj['secrets_backend']
    ) as DeviceConfig['secrets_backend'],
    features: features as DeviceFeature[],
  };
}

/**
 * Map a device type + features array to Ansible role names.
 *
 * @example
 * resolveFeatureRoles('platform', ['monitoring'])
 * // => ['prometheus', 'grafana']
 *
 * resolveFeatureRoles('app_service', ['monitoring', 'cloudflare'])
 * // => ['node_exporter', 'grafana-alloy', 'cloudflare-tunnel-api']
 */
export function resolveFeatureRoles(
  type: DeviceConfig['type'],
  features: string[]
): string[] {
  const roles: string[] = [];
  const map = FEATURE_ROLE_MAP[type];

  for (const feature of features) {
    const featureRoles = map[feature as DeviceFeature];
    if (featureRoles) {
      roles.push(...featureRoles);
    }
  }

  return roles;
}
