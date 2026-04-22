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
