# Refactor: Split cli.tsx into per-command entry-point files

## What

Break `cli/src/cli.tsx` (currently ~498 lines) into one file per top-level command group, placed in a new `cli/src/entry-points/` directory.

## Why

`cli.tsx` is a god file — it owns registration logic for every command. Each new command or sub-command adds noise to a single file, making it hard to navigate and review. Splitting by domain makes ownership clear and reduces diff noise in PRs.

## How

Each entry-point file exports a single function with the signature:

```ts
export function register<Name>Command(program: Command): void
```

It receives the root `program` instance, creates the command group, and attaches all sub-commands. `cli.tsx` becomes a thin orchestrator: it handles the preflight check, creates `program`, calls every `register*` function, and parses.

### Files to create

| File | Command group | Sub-commands |
|------|--------------|--------------|
| `entry-points/init.ts` | `init` (default) | — |
| `entry-points/credentials.ts` | `credentials` | `set` |
| `entry-points/cloudflare.ts` | `cloudflare` | `init`, `install`, `uninstall` |
| `entry-points/vault.ts` | `vault` | `install`, `uninstall` |
| `entry-points/grafana.ts` | `grafana` | `init`, `install`, `uninstall` |
| `entry-points/loki.ts` | `loki` | `install` |
| `entry-points/prometheus.ts` | `prometheus` | `init`, `install` |
| `entry-points/metrics-agent.ts` | `metrics-agent` | `init`, `install`, `uninstall` |
| `entry-points/github-build-workflow.ts` | `github-build-workflow` | `install` |
| `entry-points/github-runner.ts` | `github-runner` | `install` |
| `entry-points/target.ts` | `target` | `init` |
| `entry-points/install.ts` | `install` (top-level) | — |
| `entry-points/uninstall.ts` | `uninstall` (top-level) | — |

The `apply` command stays imported from `commands/applyCommand.js` (it already has its own file); `cli.tsx` continues calling `program.addCommand(buildApplyCommand())`.

### Resulting cli.tsx (sketch)

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { validateArchitecture } from './validators/architecture.js';
import { registerInitCommand } from './entry-points/init.js';
// ... all other imports ...

const validation = validateArchitecture();
// preflight warning block (unchanged)

const program = new Command();
program.name('iac-toolbox') /* ... */;

registerInitCommand(program);
registerCredentialsCommand(program);
registerCloudflareCommand(program);
// ... rest ...

const { buildApplyCommand } = await import('./commands/applyCommand.js');
program.addCommand(buildApplyCommand());

if (process.argv.length === 2) program.help();
program.parse();
```

## Files affected

- `cli/src/cli.tsx` — reduced to ~30 lines
- `cli/src/entry-points/*.ts` — 13 new files (no `.tsx` needed; none render JSX directly — they do dynamic imports for wizards inside `.action()` callbacks, same as today)

## Tradeoffs

- **No behaviour change** — pure structural move; all dynamic imports stay inside `.action()` callbacks.
- Entry-point files use `.ts` extension (not `.tsx`) because the JSX rendering stays inside the dynamically-imported wizard components, not in the command registration code itself.
- The `register*` functions are intentionally simple (no class, no factory) — matching the existing imperative style of the codebase.
