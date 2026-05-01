# Tasks: GitHub Build Workflow Docker image name defaults to hardcoded `my-repo`

Source: 004-github-workflow-docker-image-name-wrong-default.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: fix/github-workflow-docker-image-name-wrong-default
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: complete

## Tasks

- [x] 1. Fix `GitHubBuildWorkflowDialog.tsx` line 130 — replace hardcoded `my-repo` with `path.basename(process.cwd())` and add `import path from 'path'`
- [x] 2. Run full validation suite — `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0
