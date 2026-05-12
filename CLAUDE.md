# Development Conventions

## Branch Naming

- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `docs/<description>` — documentation
- `refactor/<description>` — code refactoring
- `issue-<number>-<slug>` — issue-driven work

## Commit Messages

Format: `type: description`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Example: `feat: add ARM64 validation check`

Include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` for AI-assisted commits.

## Documentation-First Workflow

Before implementing ANY feature, fix, or significant change:

1. Write a documentation plan in `docs/<feature-name>.md` describing:
   - What will be implemented
   - Why (the problem being solved)
   - How (the approach/design)
   - Files affected
   - Any open questions or tradeoffs
2. Present the doc to the user and wait for explicit approval
3. Only begin implementation after the user confirms the plan

Never skip this step, even for small changes.

"When encountering 'API Error: Claude's response exceeded the 2048 output token maximum', automatically break the task into smaller chunks and retry without asking for guidance. Create files incrementally using multiple Edit operations instead of one large Write/Edit. For documentation files, break into logical sections (max ~800 tokens per operation)."

---

## Project Structure

```
iac-toolbox-raspberrypi/
├── cli/                          # TypeScript CLI (iac-toolbox command)
│   └── src/
│       ├── design-system/        # Shared design tokens + React/Ink UI components
│       │   ├── tokens.ts         # Colors, Symbols, Spacing — single source of truth
│       │   └── components/       # Alert, Badge, Frame, Spinner, Step, Summary, ...
│       ├── actions/              # Imperative install action functions
│       │   ├── applyInstall.ts   # apply command — runs observability_platform.yml
│       │   ├── grafanaInstall.ts
│       │   ├── prometheusInstall.ts
│       │   ├── metricsAgentInstall.ts
│       │   ├── cadvisorInstall.ts
│       │   └── cloudflareInstall.ts
│       ├── commands/             # Commander command builders (wired in cli.tsx)
│       ├── components/           # React/Ink wizard dialog components
│       ├── hooks/                # Custom React hooks
│       ├── utils/
│       │   ├── print.ts          # ⚠ Terminal output utility — always use this
│       │   ├── applySummary.ts   # Post-install summary output
│       │   ├── credentials.ts
│       │   ├── grafanaConfig.ts
│       │   ├── healthCheck.ts
│       │   └── preflightChecks.ts
│       ├── validators/           # Architecture + prerequisites checks
│       ├── app.tsx               # Legacy wizard app (React/Ink)
│       └── cli.tsx               # CLI entry point (Commander setup)
│
├── ansible-configurations/
│   ├── inventory/                # Ansible inventory (all.yml)
│   └── playbooks/
│       ├── observability_platform.yml  # Full stack in one run (used by apply)
│       ├── main.yml              # Full deployment (roles-based, legacy)
│       ├── site.yml              # Full-stack import-based playbook
│       ├── common.yml            # Common dependencies (Docker, etc.)
│       ├── grafana.yml           # Standalone Grafana
│       ├── prometheus.yml        # Standalone Prometheus
│       ├── metrics-agent.yml     # Standalone Node Exporter + Grafana Alloy
│       ├── cadvisor.yml          # Standalone cAdvisor
│       ├── cloudflare.yml        # Standalone Cloudflare Tunnel
│       └── roles/
│           ├── common/           # Docker, base packages
│           ├── grafana/
│           ├── prometheus/
│           ├── node_exporter/
│           ├── grafana-alloy/
│           ├── cadvisor/         # Docker Compose — cAdvisor container metrics
│           ├── cloudflare-tunnel/
│           └── cloudflare-tunnel-api/
│
├── scripts/
│   └── install.sh               # Shell entry point — dispatches to Ansible playbooks
│                                #   --observability-platform  (used by apply)
│                                #   --grafana | --prometheus | --metrics-agent
│                                #   --cadvisor | --cloudflared | --vault
│
├── docs/                        # Documentation plans (required before any change)
└── terraform/                   # Grafana alerts (Terraform)
```

---

## Design System — Required for All Output

> **The design system is the only approved way to produce terminal output in this
> codebase. Never write raw `console.log`, `console.error`, or `console.warn`.**

### In action files and utils (non-React context)

Use `cli/src/utils/print.ts` — a thin wrapper that imports tokens from the design
system and applies chalk colours:

```typescript
import { print } from '../utils/print.js';

print.step('Installing Grafana...');           // ◆  Installing Grafana...  (cyan)
print.success('Health check passed');          // │  ✔ Health check passed  (green)
print.error('Credentials missing');            // │  ✗ Credentials missing  (red)
print.warning('Health endpoint unavailable');  // │  ⚠ Health endpoint...   (yellow)
print.waiting('Waiting for container...');     // │  ◜ Waiting for...       (muted)
print.pipe('Dashboard  http://localhost:3000');// │  Dashboard  http://...
print.pipe();                                  // │
print.close();                                 // └
print.blank();                                 // (empty line)
print.divider();                               // │  ════...
print.stepFailure(name, retryCommand);         // full error block to stderr
```

### In React/Ink wizard components

Use components from `cli/src/design-system/` directly:

```tsx
import { Alert, Spinner, Step, Summary, Badge } from '../design-system/index.js';
```

Do **not** bypass these with inline `<Text color="red">` — use the design system
components which encode the correct color and symbol semantics.

---

# Validation Commands

Run in order. Stop and fix before continuing if any command fails.

```bash
# Validate Ansible playbooks syntax
ansible-playbook --syntax-check ansible-configurations/playbooks/main.yml

# Lint shell scripts (if shellcheck is available)
# shellcheck scripts/*.sh

# Test Ansible playbooks in check mode (dry-run)
cd ansible-configurations && ansible-playbook -i inventory/all.yml playbooks/main.yml --check --diff
```

> ⚠️ **Note**: `ansible-lint` and `shellcheck` are recommended but not currently installed on this system. Install them for additional validation:
> - `pip install ansible-lint`
> - `brew install shellcheck` (macOS) or `apt install shellcheck` (Linux)

# Testing Checklist

All commands must exit 0. A non-zero exit code is a hard failure — do not commit, do not mark PASS.

- [ ] Branch follows naming convention (`feat/`, `fix/`, `docs/`, `refactor/`, `issue-N-slug`)
- [ ] Commits follow format (`type: description`)
- [ ] No merge conflicts with base branch
- [ ] Ansible playbook syntax is valid (`--syntax-check` passes)
- [ ] Ansible playbook dry-run completes without errors (`--check` mode)
- [ ] Shell scripts pass shellcheck (if available)
- [ ] Documentation updated if behavior changes
- [ ] No sensitive data (tokens, passwords) committed to repository
