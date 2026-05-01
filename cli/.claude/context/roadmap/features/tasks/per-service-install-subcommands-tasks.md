# Tasks: Per-Service Install Subcommands — iac-toolbox <service> install

Source: 06-per-service-install-subcommands.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/per-service-install-subcommands
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: pending

## Tasks

- [ ] 1. Add `github_runner_token` and `github_runner_repo_url` to `CREDENTIAL_KEYS` in `src/utils/credentials.ts`
- [ ] 2. Add `docker_hub_username` to `CREDENTIAL_KEYS` if not already present
- [ ] 3. Fix `grafana install` in `cli.tsx` to pass `--grafana` instead of `--ansible-only`
- [ ] 4. Add `loki` command with `install` subcommand to `cli.tsx`
- [ ] 5. Add `prometheus` command with `install` subcommand to `cli.tsx`
- [ ] 6. Add `github-build-workflow` command with `install` subcommand to `cli.tsx` (injects `DOCKER_HUB_TOKEN`, `DOCKER_HUB_USERNAME`)
- [ ] 7. Add `github-runner` command with `install` subcommand to `cli.tsx` (injects `GITHUB_RUNNER_TOKEN`, `GITHUB_RUNNER_REPO_URL`)
- [ ] 8. Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` — all must exit 0
