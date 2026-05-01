# Testing Checklist

> Auto-extracted from CLAUDE.md on 2026-04-22. Do not edit manually — re-run /autopilot-workflow:init to refresh.

## Hard Rules

All commands must exit 0. Non-zero exit is a hard failure — do not commit, do not mark PASS.

## Validation Commands

Run in order. Stop and fix before continuing if any command fails.

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

## Acceptance Checklist

- [ ] Branch follows naming convention
- [ ] Commits follow format (`type: description`)
- [ ] No merge conflicts with base branch
- [ ] All validation commands pass
