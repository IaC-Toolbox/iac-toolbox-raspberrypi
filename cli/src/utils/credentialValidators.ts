import type { CredentialKey } from './credentials.js';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Validate a Docker Hub token by querying the Docker Hub API.
 */
async function validateDockerHubToken(
  token: string
): Promise<ValidationResult> {
  try {
    // Use the repositories endpoint with the PAT as bearer token
    const repoRes = await fetch('https://hub.docker.com/v2/repositories/', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (repoRes.ok) {
      return { valid: true, message: 'Connected to Docker Hub' };
    }

    return { valid: false, message: `Docker Hub returned ${repoRes.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to Docker Hub: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Validate a GitHub personal access token.
 */
async function validateGitHubPat(token: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = (await res.json()) as { login?: string };
      return {
        valid: true,
        message: `Connected as "${data.login || 'unknown'}"`,
      };
    }

    return { valid: false, message: `GitHub returned ${res.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to GitHub: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Validate a Cloudflare Tunnel token by checking the verify endpoint.
 */
async function validateCloudflareToken(
  token: string
): Promise<ValidationResult> {
  try {
    const res = await fetch(
      'https://api.cloudflare.com/client/v4/user/tokens/verify',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        return { valid: true, message: 'Cloudflare token verified' };
      }
    }

    return { valid: false, message: `Cloudflare returned ${res.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to Cloudflare: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Validate a HashiCorp Vault token by checking the token lookup endpoint.
 */
async function validateVaultToken(token: string): Promise<ValidationResult> {
  try {
    // Default Vault address; users can override via VAULT_ADDR
    const vaultAddr = process.env['VAULT_ADDR'] || 'http://127.0.0.1:8200';
    const res = await fetch(`${vaultAddr}/v1/auth/token/lookup-self`, {
      headers: { 'X-Vault-Token': token },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return { valid: true, message: 'Vault token verified' };
    }

    return { valid: false, message: `Vault returned ${res.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to Vault: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Validate a Grafana API key by checking the current org endpoint.
 */
async function validateGrafanaApiKey(key: string): Promise<ValidationResult> {
  try {
    const grafanaUrl = process.env['GRAFANA_URL'] || 'http://127.0.0.1:3000';
    const res = await fetch(`${grafanaUrl}/api/org/`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = (await res.json()) as { name?: string };
      return {
        valid: true,
        message: `Connected to "${data.name || 'Grafana'}"`,
      };
    }

    return { valid: false, message: `Grafana returned ${res.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to Grafana: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Validate a PagerDuty integration key by checking the abilities endpoint.
 */
async function validatePagerDutyKey(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.pagerduty.com/abilities', {
      headers: {
        Authorization: `Token token=${key}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return { valid: true, message: 'Connected to PagerDuty' };
    }

    return { valid: false, message: `PagerDuty returned ${res.status}` };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to connect to PagerDuty: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Accept any non-empty string value (no remote API to validate against).
 */
async function validateStringValue(value: string): Promise<ValidationResult> {
  if (!value || value.trim() === '') {
    return { valid: false, message: 'Value is empty' };
  }
  return { valid: true, message: 'Value accepted' };
}

/**
 * Map of credential key to its validator function.
 */
const validators: Record<
  CredentialKey,
  (value: string) => Promise<ValidationResult>
> = {
  docker_hub_token: validateDockerHubToken,
  docker_hub_username: validateStringValue,
  github_pat: validateGitHubPat,
  github_runner_token: validateStringValue,
  github_runner_repo_url: validateStringValue,
  cloudflare_tunnel_token: validateCloudflareToken,
  vault_token: validateVaultToken,
  grafana_api_key: validateGrafanaApiKey,
  pagerduty_key: validatePagerDutyKey,
};

/**
 * Validate a credential value against its corresponding API.
 * Returns a ValidationResult with success/failure and a message.
 */
export async function validateCredential(
  key: CredentialKey,
  value: string
): Promise<ValidationResult> {
  const validator = validators[key];
  if (!validator) {
    return { valid: false, message: `No validator for key: ${key}` };
  }

  if (!value || value.trim() === '') {
    return { valid: false, message: 'Value is empty' };
  }

  return validator(value);
}

/**
 * Check whether a given key has a validator.
 */
export function hasValidator(key: string): key is CredentialKey {
  return key in validators;
}
