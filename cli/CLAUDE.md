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

## Imports

Always use static imports at the top of the file. Never use dynamic `await import(...)` inside functions or callbacks.

## File Naming

TypeScript source files use **lowercase-with-hyphens** (kebab-case), not camelCase.

- `grafana-init-wizard.tsx` not `GrafanaInitWizard.tsx`
- `metrics-agent.ts` not `metricsAgent.ts`
- `apply-command.ts` not `applyCommand.ts`

This applies to all files under `src/` — components, actions, utils, entry-points, commands, hooks, validators.

# Validation Commands

Run in order. Stop and fix before continuing if any command fails.

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

# Testing Checklist

All commands must exit 0. A non-zero exit code is a hard failure — do not commit, do not mark PASS.

- [ ] Branch follows naming convention
- [ ] Commits follow format (`type: description`)
- [ ] No merge conflicts with base branch
- [ ] All validation commands pass
