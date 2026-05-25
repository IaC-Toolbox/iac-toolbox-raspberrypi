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

export function parseGithubRepo(repoUrl: string): {
  owner: string;
  repo: string;
} {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  return { owner: match[1], repo: match[2] };
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

/** @deprecated Use loadGithubRunnerPat instead. Kept for backward compatibility. */
export function loadGithubRunnerToken(profile = 'default'): string | undefined {
  return getCredential('github_runner_token', profile);
}

export function loadGithubRunnerPat(profile = 'default'): string | undefined {
  return getCredential('github_runner_pat', profile);
}

/**
 * Validate that a PAT has access to the given GitHub repository.
 * Makes a GET request to the repo endpoint. Throws on 401, 403, or 404.
 */
export async function validatePatAccess(
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
      },
    }
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('PAT is invalid or expired (401)');
    }
    if (response.status === 403) {
      throw new Error('PAT lacks required permissions (403)');
    }
    if (response.status === 404) {
      throw new Error('Repository not found or PAT cannot access it (404)');
    }
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }
}

/**
 * Generate a runner registration token via the GitHub API.
 * The returned token is valid for 1 hour.
 * Never stored to disk — caller passes it directly to Ansible.
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
      },
    }
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(
        'PAT is invalid or expired — re-run `iac-toolbox github-runner init` with a new PAT (401)'
      );
    }
    if (response.status === 403) {
      throw new Error(
        'PAT lacks required permissions — ensure it has repo (classic) or Administration read/write (fine-grained) scope (403)'
      );
    }
    if (response.status === 404) {
      throw new Error('Repository not found or PAT cannot access it (404)');
    }
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }
  const data = (await response.json()) as { token: string; expires_at: string };
  return data.token;
}

export function updateGithubRunnerConfig(
  destination: string,
  repoUrl: string,
  pat: string,
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

  // Save PAT to credentials store — never written to YAML.
  setCredential('github_runner_pat', pat, profile);

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
