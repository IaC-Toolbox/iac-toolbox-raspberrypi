# Tasks: Sync Integration Defaults into iac-toolbox.yml

Source: 05-sync-integration-defaults-to-iac-toolbox-yml.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/sync-integration-defaults-to-iac-toolbox-yml
Base branch: feat/sync-integration-defaults
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: pending

## Tasks

- [ ] 1. Fix `roles/loki/defaults/main.yml` — rename `loki_defaults` → `loki` (add `base_dir`, `enabled`) and `alloy_defaults` → `alloy`
- [ ] 2. Fix `roles/cloudflare-tunnel/defaults/main.yml` — replace flat `cloudflare_enabled: true` with nested `cloudflare:` dict including `enabled`, `tunnel_name`
- [ ] 3. Fix `roles/promote_to_github_runner/defaults/main.yml` — replace flat `github_runner_enabled: true` with nested `github_runner:` dict with all keys tasks reference
- [ ] 4. Update `src/utils/iacToolboxConfig.ts` — emit full key sets for grafana, vault, loki, cloudflare, github_runner when enabled
- [ ] 5. Update `infrastructure/iac-toolbox.yml` — add `base_dir` and other missing keys to each enabled integration block
- [ ] 6. Run validation — `pnpm test:ci`, `pnpm typecheck`, `pnpm lint`, `ansible-playbook --syntax-check`
