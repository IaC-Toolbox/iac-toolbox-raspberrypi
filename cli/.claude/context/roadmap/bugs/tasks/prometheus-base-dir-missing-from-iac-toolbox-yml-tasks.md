# Tasks: prometheus.base_dir missing from iac-toolbox.yml causes Ansible task failure

Source: 005-prometheus-base-dir-missing-from-iac-toolbox-yml.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: fix/prometheus-base-dir-missing-from-iac-toolbox-yml
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: complete

## Tasks

- [ ] 1. Add `base_dir` to the `prometheus:` section in `infrastructure/iac-toolbox.yml` — value should be `~/.iac-toolbox/observability` to match the role default
- [ ] 2. Validate with `ansible-playbook --syntax-check -i inventory/all.yml playbooks/main.yml` from the `infrastructure/ansible-configurations/` directory
