/**
 * Supported feature names for a device config.
 */
export type DeviceFeature =
  | 'monitoring'
  | 'cloudflare'
  | 'llm'
  | 'github-runner';

/**
 * Supported device types.
 */
export type DeviceType = 'platform' | 'app_service';

/**
 * Secrets backend options.
 */
export type SecretsBackend = 'vault';

/**
 * Describes a single target device.
 *
 * Each iac-toolbox per-device config file must conform to this schema.
 */
export interface DeviceConfig {
  type: DeviceType;
  host: string;
  ssh_user: string;
  secrets_backend: SecretsBackend;
  features: DeviceFeature[];
}
