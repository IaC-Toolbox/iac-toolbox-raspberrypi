import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  loadIacToolboxYaml,
  resolveConfigPath,
} from 'src/loaders/yaml-loader.js';
import {
  setCredential,
  getCredential,
} from '../../loaders/credentials-loader.js';

const DEFAULT_VERSION = '2.323.0';
const DEFAULT_LABELS = 'self-hosted';
const DEFAULT_WORK_DIR = '~/.iac-toolbox/github-runner';

interface IacToolboxYaml {
  [key: string]: unknown;
  github_runner?: {
    enabled?: boolean;
    version?: string;
    repo_url?: string;
    labels?: string;
    work_dir?: string;
    [key: string]: unknown;
  };
}

export function loadGithubRunnerRepoUrl(
  destination: string,
  filePath?: string
): string | undefined {
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxYaml;
  return config.github_runner?.repo_url;
}

export function loadGithubRunnerLabels(
  destination: string,
  filePath?: string
): string | undefined {
  const config = loadIacToolboxYaml(destination, filePath) as IacToolboxYaml;
  return config.github_runner?.labels;
}

/**
 * @deprecated Use loadGithubRunnerPat instead.
 * Kept for backward compatibility only — no longer used in wizard or validation.
 */
export function loadGithubRunnerToken(profile = 'default'): string | undefined {
  return getCredential('github_runner_token', profile);
}

export function loadGithubRunnerPat(profile = 'default'): string | undefined {
  return getCredential('github_runner_pat', profile);
}

export function setGithubRunnerPat(pat: string, profile = 'default'): void {
  setCredential('github_runner_pat', pat, profile);
}

/**
 * Parse a GitHub repository URL into owner and repo name.
 * Accepts https://github.com/owner/repo, https://github.com/owner/repo.git,
 * and https://github.com/owner/repo/tree/main (with trailing path segments).
 */
export function parseGithubRepo(repoUrl: string): {
  owner: string;
  repo: string;
} {
  const match = repoUrl.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/
  );
  if (!match) throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  return { owner: match[1], repo: match[2] };
}

/**
 * Validate that the PAT has access to the given repository.
 * Uses a read-only GET request — no mutations.
 * Throws a descriptive error on 401 (invalid PAT), 403 (insufficient scope),
 * or 404 (repo not found / inaccessible).
 */
export async function validateGithubPat(
  repoUrl: string,
  pat: string
): Promise<void> {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'iac-toolbox',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'PAT is invalid or expired (HTTP 401). Generate a new token at https://github.com/settings/tokens'
      );
    }
    if (response.status === 403) {
      throw new Error(
        'PAT lacks required permissions (HTTP 403). Ensure the PAT has "repo" scope (classic) or "Administration: Read and Write" (fine-grained).'
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Repository not found or PAT cannot access it (HTTP 404). Check the URL: ${repoUrl}`
      );
    }
    throw new Error(
      `GitHub API error ${response.status}: ${await response.text()}`
    );
  }
}

/**
 * Generate a fresh runner registration token using the GitHub API.
 * The returned token is valid for 1 hour — it should be passed directly
 * to Ansible and never stored on disk.
 */
export async function generateRunnerRegistrationToken(
  repoUrl: string,
  pat: string
): Promise<string> {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runners/registration-token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'iac-toolbox',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'PAT is invalid or expired (HTTP 401). Re-run `iac-toolbox github-runner init` with a new PAT.'
      );
    }
    if (response.status === 403) {
      throw new Error(
        'PAT lacks required permissions (HTTP 403). Ensure the PAT has "repo" scope (classic) or "Administration: Read and Write" (fine-grained).'
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Repository not found or PAT cannot access it (HTTP 404). Check that the repo URL is correct: ${repoUrl}`
      );
    }
    throw new Error(
      `GitHub API error ${response.status}: ${await response.text()}`
    );
  }

  const body = (await response.json()) as { token: string; expires_at: string };
  return body.token;
}

export function updateGithubRunnerConfig(
  destination: string,
  repoUrl: string,
  labels: string,
  profile = 'default',
  filePath?: string
): void {
  const configPath = filePath
    ? path.resolve(filePath)
    : resolveConfigPath(destination);
  let config: IacToolboxYaml = {};

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      config = (yaml.load(content) as IacToolboxYaml) || {};
    } catch {
      config = {};
    }
  }

  // PAT is stored separately in credentials — never written to YAML.
  // (profile parameter kept for future multi-profile support)
  void profile;

  config.github_runner = {
    ...(config.github_runner || {}),
    enabled: true,
    version: config.github_runner?.version ?? DEFAULT_VERSION,
    repo_url: repoUrl,
    labels: labels || DEFAULT_LABELS,
    work_dir: config.github_runner?.work_dir ?? DEFAULT_WORK_DIR,
  };

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const yamlContent =
    '# Generated by iac-toolbox\n# Safe to commit — no secrets stored here\n' +
    yaml.dump(config, { lineWidth: -1, quotingType: '"' });
  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}
