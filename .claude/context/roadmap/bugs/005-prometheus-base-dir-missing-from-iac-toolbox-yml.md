---
status: completed
completed_date: 2026-04-24
pr_url: https://github.com/IaC-Toolbox/iac-toolbox-cli/pull/138
---

# Bug: prometheus.base_dir missing from iac-toolbox.yml causes Ansible task failure

## Summary

The `prometheus` dict in `infrastructure/iac-toolbox.yml` is missing the `base_dir` key. Because Ansible's default `hash_behaviour` is `replace`, loading this file via `--extra-vars` completely replaces the role's `defaults/main.yml` dict — dropping `base_dir`. Every Ansible task that references `{{ prometheus.base_dir }}` then fails with `object of type 'dict' has no attribute 'base_dir'`.

## Repo

iac-toolbox-cli

## Observed behaviour

```
Finalization of task args for 'ansible.builtin.file' failed.
Origin: infrastructure/ansible-configurations/playbooks/roles/prometheus/tasks/main.yml:3:3

Error while resolving value for 'path': object of type 'dict' has no attribute 'base_dir'
Origin: .../prometheus/tasks/main.yml:4:11
    path: "{{ prometheus.base_dir }}"

fatal: [iac-toolbox-target]: FAILED! => {"msg": "Task failed: Finalization of task args for
 'ansible.builtin.file' failed: Error while resolving value for 'path': object of type 'dict'
 has no attribute 'base_dir'"}
```

## Expected behaviour

The Prometheus role should run without errors. `prometheus.base_dir` should resolve to `~/.iac-toolbox/observability` (the default defined in the role) when not overridden by the user.

## Relevant files

- `infrastructure/iac-toolbox.yml` — `prometheus:` dict is missing `base_dir` (line 28–33)
- `infrastructure/ansible-configurations/playbooks/roles/prometheus/defaults/main.yml` — defines `prometheus.base_dir` but this is clobbered by `--extra-vars`
- `infrastructure/ansible-configurations/playbooks/roles/prometheus/tasks/main.yml` — all tasks reference `{{ prometheus.base_dir }}`

## Context

`iac-toolbox.yml` is loaded via `--extra-vars "@iac-toolbox.yml"` by the install script. When Ansible merges `--extra-vars` with role defaults using `hash_behaviour: replace` (the default), the entire `prometheus` dict in `iac-toolbox.yml` replaces the one in `defaults/main.yml`. Since `iac-toolbox.yml`'s `prometheus` block contains only `enabled`, `version`, `port`, `scrape_interval`, and `retention` — but not `base_dir` — the key is lost and every reference to `prometheus.base_dir` in tasks fails.

## Likely cause

`base_dir` was added to the role's `defaults/main.yml` at some point but was never back-ported into the `iac-toolbox.yml` template. The two dicts drifted out of sync. Because `--extra-vars` replaces (not merges) dicts, the missing key causes a hard failure at runtime.

## Acceptance criteria

- [ ] `infrastructure/iac-toolbox.yml` includes `base_dir: "~/.iac-toolbox/observability"` under the `prometheus:` key
- [ ] The Ansible prometheus role tasks resolve `{{ prometheus.base_dir }}` without error when `iac-toolbox.yml` is loaded via `--extra-vars`
- [ ] `ansible-playbook --syntax-check` exits 0 against the main playbook

## Validation

```bash
# From infrastructure/ansible-configurations/
ansible-playbook --syntax-check -i inventory/all.yml playbooks/main.yml
```
