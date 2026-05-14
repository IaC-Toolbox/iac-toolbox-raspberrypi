import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Supported credential keys and their descriptions.
 */
export const CREDENTIAL_KEYS = {
  docker_hub_token: 'Docker Hub personal access token',
  docker_hub_username: 'Docker Hub username',
  cloudflare_tunnel_token: 'Cloudflare Tunnel token',
  cloudflare_api_token: 'Cloudflare API token',
  grafana_api_key: 'Grafana API key',
  grafana_admin_password: 'Grafana admin password',
  pagerduty_key: 'PagerDuty integration key',
} as const;

export type CredentialKey = keyof typeof CREDENTIAL_KEYS;

export interface CredentialProfile {
  [key: string]: string;
}

export interface CredentialsFile {
  [profile: string]: CredentialProfile;
}

const CREDENTIALS_DIR = path.join(os.homedir(), '.iac-toolbox');
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, 'credentials');
const DEFAULT_PROFILE = 'default';

/**
 * Returns the path to the credentials file.
 */
export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}

/**
 * Returns the path to the credentials directory.
 */
export function getCredentialsDir(): string {
  return CREDENTIALS_DIR;
}

/**
 * Parse an INI-style credentials file into a structured object.
 *
 * Format:
 *   [profile-name]
 *   key = value
 */
export function parseCredentialsFile(content: string): CredentialsFile {
  const result: CredentialsFile = {};
  let currentProfile: string | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    // Profile header: [profile-name]
    const profileMatch = line.match(/^\[([^\]]+)\]$/);
    if (profileMatch) {
      currentProfile = profileMatch[1].trim();
      if (!result[currentProfile]) {
        result[currentProfile] = {};
      }
      continue;
    }

    // Key-value pair: key = value
    const kvMatch = line.match(/^([^=]+)=(.*)$/);
    if (kvMatch && currentProfile) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      result[currentProfile][key] = value;
    }
  }

  return result;
}

/**
 * Serialize a CredentialsFile object back into INI format.
 */
export function serializeCredentialsFile(data: CredentialsFile): string {
  const sections: string[] = [];

  for (const [profile, entries] of Object.entries(data)) {
    const lines: string[] = [`[${profile}]`];
    for (const [key, value] of Object.entries(entries)) {
      lines.push(`${key} = ${value}`);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n') + '\n';
}

/**
 * Ensure the credentials directory exists with correct permissions.
 */
function ensureCredentialsDir(): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Read and parse the credentials file. Returns an empty object if
 * the file does not exist.
 */
export function readCredentialsFile(): CredentialsFile {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return {};
  }

  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return parseCredentialsFile(content);
  } catch {
    return {};
  }
}

/**
 * Write the credentials file with 600 permissions (owner read/write only).
 */
export function writeCredentialsFile(data: CredentialsFile): void {
  ensureCredentialsDir();
  const content = serializeCredentialsFile(data);
  fs.writeFileSync(CREDENTIALS_PATH, content, { mode: 0o600 });
}

/**
 * Load credentials for a specific profile. Returns an empty object
 * if the profile does not exist.
 */
export function loadCredentials(
  profile: string = DEFAULT_PROFILE
): CredentialProfile {
  const allCredentials = readCredentialsFile();
  return allCredentials[profile] || {};
}

/**
 * Save credentials for a specific profile. Merges with existing
 * credentials in that profile.
 */
export function saveCredentials(
  credentials: CredentialProfile,
  profile: string = DEFAULT_PROFILE
): void {
  const allCredentials = readCredentialsFile();

  if (!allCredentials[profile]) {
    allCredentials[profile] = {};
  }

  // Merge: new values overwrite existing ones
  for (const [key, value] of Object.entries(credentials)) {
    if (value) {
      allCredentials[profile][key] = value;
    }
  }

  writeCredentialsFile(allCredentials);
}

/**
 * Set a single credential key in a profile.
 */
export function setCredential(
  key: string,
  value: string,
  profile: string = DEFAULT_PROFILE
): void {
  saveCredentials({ [key]: value }, profile);
}

/**
 * Get a single credential value from a profile.
 * Returns undefined if not found.
 */
export function getCredential(
  key: string,
  profile: string = DEFAULT_PROFILE
): string | undefined {
  const creds = loadCredentials(profile);
  return creds[key];
}

/**
 * List all available profiles in the credentials file.
 */
export function listProfiles(): string[] {
  const allCredentials = readCredentialsFile();
  return Object.keys(allCredentials);
}

/**
 * Ensure a .gitignore exists in the credentials directory to prevent
 * accidental commits.
 */
export function ensureGitignore(): void {
  ensureCredentialsDir();
  const gitignorePath = path.join(CREDENTIALS_DIR, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n', { mode: 0o600 });
  }
}
