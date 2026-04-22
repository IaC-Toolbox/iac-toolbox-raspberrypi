# Bug Fix: Remove Unconditional Python Installation from Setup Role

**Issue**: The `setup` role unconditionally installed Python 3 and pip on the target system, even when no roles required Python on the host.

**Impact**: Minimal configurations (e.g., app-server profile with only Docker and container-based services) installed unnecessary packages.

## Root Cause

The setup role (`ansible-configurations/playbooks/roles/setup/tasks/main.yml`) included a task to install Python 3 and pip that ran regardless of which services were enabled in `iac-toolbox.yml`.

## Analysis

Investigation revealed that:
1. No current roles require Python on the host system
2. All services (Vault, Grafana, Prometheus, Loki, GitHub build workflow) run in Docker containers
3. Ansible itself requires Python to already be present on the target system to execute playbooks
4. The Python check in main.yml pre_tasks validates that Python is available (which it must be for Ansible to work)

## Solution

Removed the Python installation task from the setup role (lines 11-17). Python is already required by Ansible to function, so explicit installation is redundant. All application workloads run in containers and don't require Python on the host.

## Changes

**File**: `ansible-configurations/playbooks/roles/setup/tasks/main.yml`

**Removed**:
```yaml
- name: Install Python 3 and pip
  apt:
    name:
      - python3
      - python3-pip
    state: latest
    update_cache: yes
```

## Validation

- Ansible playbook syntax check passes
- Ansible playbook dry-run (`--check` mode) completes without errors
- Python version check in main.yml pre_tasks confirms Python availability (required by Ansible)
- No roles depend on Python packages installed via pip

## Notes

- Python must be present on Raspberry Pi OS for Ansible to connect and execute
- This is a base requirement of Ansible's architecture, not something we need to install
- If future roles genuinely need Python packages on the host, they should declare this dependency explicitly
