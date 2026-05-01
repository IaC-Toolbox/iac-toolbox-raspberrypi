---
status: draft
completed_date:
pr_url:
---

# Per-Service Install Subcommands — `iac-toolbox <service> install`

## Overview

The CLI currently exposes `iac-toolbox vault install`, `iac-toolbox cloudflare install`, and `iac-toolbox grafana install` — but the four remaining services (loki, prometheus, github-build-workflow, github-runner) have no CLI entry point. Operators must invoke `install.sh` directly to deploy them. This feature adds the missing service commands to `cli.tsx` so every service managed by the playbook split (feature 06-split-playbooks) is reachable via `iac-toolbox <service> install`. It also fixes `grafana install`, which currently passes `--ansible-only` (runs `main.yml`) instead of the forthcoming `--grafana` flag (runs `playbooks/grafana.yml`).

**Depends on:** backend feature "Split Playbooks Per Service" — `install.sh` must accept `--grafana`, `--loki`, `--prometheus`, `--github-build-workflow`, and `--promote-to-github-runner` flags before this feature can be wired up.

## What Changes

| Area | Change |
|---|---|
| `src/cli.tsx` | Add `loki`, `prometheus`, `github-build-workflow`, `github-runner` top-level commands, each with an `install` subcommand |
| `src/cli.tsx` | Fix `grafana install` to pass `--grafana` instead of `--ansible-only` |
| `src/cli.tsx` | `github-runner install` passes `GITHUB_RUNNER_TOKEN` and `GITHUB_RUNNER_REPO_URL` from credentials |
| `src/cli.tsx` | `github-build-workflow install` passes `DOCKER_HUB_TOKEN` and `DOCKER_HUB_USERNAME` from credentials |
| `src/utils/credentials.ts` | Confirm `github_runner_token` and `github_runner_repo_url` keys exist (add if absent) |

## Interfaces touched

### `iac-toolbox --help` (before / after)

**Before:**
```
Commands:
  init                 Start the interactive wizard
  credentials          Manage API credentials
  cloudflare           Manage Cloudflare Tunnel integration
  vault                Manage HashiCorp Vault integration
  grafana              Manage Grafana observability stack
  install              Run install script using existing configuration
  uninstall            Remove the previously installed infra
```

**After:**
```
Commands:
  init                      Start the interactive wizard
  credentials               Manage API credentials
  cloudflare                Manage Cloudflare Tunnel integration
  vault                     Manage HashiCorp Vault integration
  grafana                   Manage Grafana observability stack
  loki                      Manage Loki log collection
  prometheus                Manage Prometheus metrics collection
  github-build-workflow     Manage GitHub Build Workflow templates
  github-runner             Manage GitHub Actions self-hosted runner
  install                   Run install script using existing configuration
  uninstall                 Remove the previously installed infra
```

### Per-service subcommand — `install.sh` flag mapping

| CLI command | `install.sh` flag | Credentials injected |
|---|---|---|
| `iac-toolbox cloudflare install` | `--cloudflared` | `CLOUDFLARE_API_TOKEN` |
| `iac-toolbox vault install` | `--vault` | _(none)_ |
| `iac-toolbox grafana install` | `--grafana` _(was `--ansible-only`)_ | `GRAFANA_ADMIN_PASSWORD` |
| `iac-toolbox loki install` | `--loki` | _(none)_ |
| `iac-toolbox prometheus install` | `--prometheus` | _(none)_ |
| `iac-toolbox github-build-workflow install` | `--github-build-workflow` | `DOCKER_HUB_TOKEN`, `DOCKER_HUB_USERNAME` |
| `iac-toolbox github-runner install` | `--promote-to-github-runner` | `GITHUB_RUNNER_TOKEN`, `GITHUB_RUNNER_REPO_URL` |

All commands pass `--local` (local Ansible execution). All use `spawnSync` with `stdio: 'inherit'` and exit with the script's exit code.

### New command blocks in `cli.tsx`

**`loki` command:**
```typescript
const loki = program
  .command('loki')
  .description('Manage Loki log collection');

loki
  .command('install')
  .description('Install or reinstall Loki log collection')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--loki', '--local'],
      { stdio: 'inherit' }
    );
    process.exit(result.status ?? 1);
  });
```

**`prometheus` command:**
```typescript
const prometheus = program
  .command('prometheus')
  .description('Manage Prometheus metrics collection');

prometheus
  .command('install')
  .description('Install or reinstall Prometheus metrics collection')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--prometheus', '--local'],
      { stdio: 'inherit' }
    );
    process.exit(result.status ?? 1);
  });
```

**`github-build-workflow` command:**
```typescript
const githubBuildWorkflow = program
  .command('github-build-workflow')
  .description('Manage GitHub Build Workflow templates');

githubBuildWorkflow
  .command('install')
  .description('Install or reinstall GitHub Build Workflow templates')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const { loadCredentials } = await import('./utils/credentials.js');
    const creds = loadCredentials('default');
    const env = {
      ...process.env,
      DOCKER_HUB_TOKEN: creds.docker_hub_token || '',
      DOCKER_HUB_USERNAME: creds.docker_hub_username || '',
    };
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--github-build-workflow', '--local'],
      { env, stdio: 'inherit' }
    );
    process.exit(result.status ?? 1);
  });
```

**`github-runner` command:**
```typescript
const githubRunner = program
  .command('github-runner')
  .description('Manage GitHub Actions self-hosted runner');

githubRunner
  .command('install')
  .description('Install or reinstall GitHub Actions self-hosted runner')
  .action(async () => {
    const { spawnSync } = await import('child_process');
    const { loadCredentials } = await import('./utils/credentials.js');
    const creds = loadCredentials('default');
    const env = {
      ...process.env,
      GITHUB_RUNNER_TOKEN: creds.github_runner_token || '',
      GITHUB_RUNNER_REPO_URL: creds.github_runner_repo_url || '',
    };
    const result = spawnSync(
      'bash',
      ['infrastructure/scripts/install.sh', '--promote-to-github-runner', '--local'],
      { env, stdio: 'inherit' }
    );
    process.exit(result.status ?? 1);
  });
```

**`grafana install` fix** (change `--ansible-only` → `--grafana`):
```typescript
// Before:
['infrastructure/scripts/install.sh', '--ansible-only', '--local'],

// After:
['infrastructure/scripts/install.sh', '--grafana', '--local'],
```

### Credential keys — `src/utils/credentials.ts`

Add to `CREDENTIAL_KEYS` if not already present:

```typescript
export const CREDENTIAL_KEYS = {
  // ... existing keys ...
  docker_hub_token: 'Docker Hub personal access token',
  docker_hub_username: 'Docker Hub username',
  github_runner_token: 'GitHub Actions runner registration token',
  github_runner_repo_url: 'GitHub repository URL for runner registration',
} as const;
```

Note: `docker_hub_token` and `docker_hub_username` may already exist in the credentials file (used by `standaloneInstall.ts`); confirm and add only what is missing.

## Data flow

```
operator runs: iac-toolbox github-runner install

cli.tsx — github-runner install action:
  loadCredentials('default')
    → reads ~/.iac-toolbox/credentials
    → extracts github_runner_token, github_runner_repo_url
  env = { ...process.env, GITHUB_RUNNER_TOKEN, GITHUB_RUNNER_REPO_URL }
  spawnSync('bash', ['infrastructure/scripts/install.sh',
                     '--promote-to-github-runner', '--local'], { env })

install.sh:
  ANSIBLE_PLAYBOOK="playbooks/promote-to-github-runner.yml"
  ansible-playbook -i inventory/all.yml playbooks/promote-to-github-runner.yml \
    --extra-vars "@iac-toolbox.yml" \
    --extra-vars "github_runner_token=$GITHUB_RUNNER_TOKEN" \
    --extra-vars "github_runner_repo_url=$GITHUB_RUNNER_REPO_URL"

promote-to-github-runner.yml:
  pre_tasks → common → setup (if Debian) → docker → promote_to_github_runner
```

The pattern is identical for every service; only the flag, playbook, and injected env vars differ.

## Configuration

No new `iac-toolbox.yml` keys. Credential keys consumed at deploy time:

| Credential key | Used by | Where set |
|---|---|---|
| `cloudflare_api_token` | `cloudflare install` | `iac-toolbox credentials set cloudflare_api_token` |
| `grafana_admin_password` | `grafana install` | `iac-toolbox credentials set grafana_admin_password` |
| `docker_hub_token` | `github-build-workflow install` | `iac-toolbox credentials set docker_hub_token` |
| `docker_hub_username` | `github-build-workflow install` | `iac-toolbox credentials set docker_hub_username` |
| `github_runner_token` | `github-runner install` | `iac-toolbox credentials set github_runner_token` |
| `github_runner_repo_url` | `github-runner install` | `iac-toolbox credentials set github_runner_repo_url` |

## Security notes

Credentials are loaded from `~/.iac-toolbox/credentials` (mode 0600, never committed). They are injected as environment variables to `install.sh`, which passes them as Ansible `--extra-vars`. No credentials appear in `iac-toolbox.yml` in plaintext — only Jinja2 placeholders like `"{{ github_runner_token }}"`. The trust boundary and injection mechanism are unchanged from the existing `cloudflare install` and `grafana install` commands.

## Acceptance criteria

- [ ] `iac-toolbox loki install` spawns `install.sh --loki --local` and exits with the script's exit code
- [ ] `iac-toolbox prometheus install` spawns `install.sh --prometheus --local` and exits with the script's exit code
- [ ] `iac-toolbox github-build-workflow install` spawns `install.sh --github-build-workflow --local` with `DOCKER_HUB_TOKEN` and `DOCKER_HUB_USERNAME` in env
- [ ] `iac-toolbox github-runner install` spawns `install.sh --promote-to-github-runner --local` with `GITHUB_RUNNER_TOKEN` and `GITHUB_RUNNER_REPO_URL` in env
- [ ] `iac-toolbox grafana install` now passes `--grafana` (not `--ansible-only`) to `install.sh`
- [ ] `iac-toolbox --help` lists all four new service commands
- [ ] `iac-toolbox vault install` is unchanged (no regression)
- [ ] `iac-toolbox cloudflare install` is unchanged (no regression)
- [ ] `CREDENTIAL_KEYS` in `credentials.ts` includes `github_runner_token` and `github_runner_repo_url`
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0

## Validation

Run the full validation suite from `CLAUDE.md`:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

Smoke-test flag routing (dry run — observe which playbook is selected):

```bash
# Verify each command passes the correct flag to install.sh
iac-toolbox loki install 2>&1 | head -5
iac-toolbox prometheus install 2>&1 | head -5
iac-toolbox github-build-workflow install 2>&1 | head -5
iac-toolbox github-runner install 2>&1 | head -5
iac-toolbox grafana install 2>&1 | head -5   # must show --grafana, not --ansible-only

# Verify help output lists all new commands
iac-toolbox --help | grep -E 'loki|prometheus|github-build-workflow|github-runner'
```

## Out of Scope

- `uninstall` subcommands for loki, prometheus, github-build-workflow, github-runner — those scripts do not exist yet; tracked separately
- Combining multiple service flags in one invocation (e.g. `iac-toolbox loki install prometheus install`)
- Remote (SSH) deployment mode via CLI flags — `--local` is hardcoded; SSH mode remains via `iac-toolbox install`
- Interactive config dialogs triggered at install time (e.g. prompting for missing `GITHUB_RUNNER_TOKEN`) — credential must be pre-set via `iac-toolbox credentials set`
- Changes to Ansible roles or playbooks — covered by the split-playbooks backend feature
