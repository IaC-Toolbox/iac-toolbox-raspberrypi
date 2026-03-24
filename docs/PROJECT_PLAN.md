# Raspberry Pi Infrastructure Automation - Project Plan

## Overview

Automated setup and configuration for Raspberry Pi 4B using Ansible:

1. **Docker Installation** - Container runtime
2. **Cloudflare Tunnel** - Secure external access
3. **GitHub Actions Runner** - Self-hosted CI/CD for ARM64
4. **Secrets Management** - Ansible Vault credential injection

## Configuration Approach

### Three-Layer Configuration System

1. **Environment Variables** (`.env`) - Infrastructure connection
2. **YAML Configuration** (`group_vars/all.yml`) - Application settings
3. **Ansible Vault** (`secrets.yml`) - Sensitive data

## Setup Workflow

### 1. Configure Environment Variables

```bash
# ansible-configurations/.env
RPI_HOST=raspberrypi.local
RPI_USER=pi
RPI_SSH_KEY=~/.ssh/id_ed25519
GITHUB_REPO_URL=https://github.com/username/repo
GITHUB_RUNNER_TOKEN=ABCD123...
RUNNER_VERSION=2.315.0
```

### 2. Configure Application Settings

```yaml
# ansible-configurations/inventory/group_vars/all.yml
cloudflare:
  enabled: true
  tunnel_name: my-rpi-tunnel
  domains:
    - hostname: api.example.com
      service_port: 4000
```

### 3. Configure Secrets

```bash
# Add to .env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://...
```

### 4. Run Setup

```bash
./scripts/setup.sh
```

Setup script:
- Installs Ansible
- Creates vault
- Runs playbook (validation happens in Ansible)

### 5. Manual Prerequisites

**Cloudflare** (if using tunnel):
```bash
ssh pi@raspberrypi.local
cloudflared tunnel login
```

## Ansible Validation Strategy

Validation embedded in playbooks using `pre_tasks`:

```yaml
pre_tasks:
  - name: Validate SSH connectivity
    ping:

  - name: Check Python installation
    command: python3 --version

  - name: Verify required variables
    assert:
      that:
        - ansible_host is defined
        - ansible_user is defined
```

## Implementation Tasks

### Phase 1: Docker Role
- Install Docker Engine
- Configure permissions
- Install Docker Compose

### Phase 2: Cloudflare Tunnel Role
- Install cloudflared
- Create tunnel
- Configure DNS from YAML
- Setup systemd service

### Phase 3: GitHub Runner Role
- Download ARM64 binary
- Configure with env vars
- Install as service

### Phase 4: Secrets Role
- Load from Vault
- Create /etc/raspberrypi.env
- Set permissions (600)

### Phase 5: Main Playbook
- Pre-task validations
- Conditional role execution
- Error handling

### Phase 6: Setup Script
- Install Ansible
- Initialize vault
- Run playbook

## Usage

### Initial Setup
```bash
./scripts/setup.sh
```

### Update Config
```bash
# Edit group_vars/all.yml
ansible-playbook ansible-configurations/playbooks/main.yml --tags cloudflare
```

### Update Secrets
```bash
cd ansible-configurations
rm secrets.yml
export $(grep -v '^#' .env | xargs)
ansible-playbook playbooks/seed_vault.yml
ansible-playbook playbooks/main.yml --tags secrets
```

### Deploy Specific Components
```bash
ansible-playbook playbooks/main.yml --tags docker
ansible-playbook playbooks/main.yml --tags github-runner
```

## Validation & Testing

Embedded in playbooks, but manual verification:

```bash
# Docker
docker --version
docker run hello-world

# Cloudflare
sudo systemctl status cloudflared

# GitHub Runner
sudo systemctl status actions.runner.*

# Secrets
cat /etc/raspberrypi.env
```

## Security

**Never commit:**
- `.env`
- `.vault_pass.txt`

**Always commit:**
- `secrets.yml` (encrypted)
- `group_vars/all.yml`
- `.env.example`

**File permissions:**
- `.env`: 600
- `.vault_pass.txt`: 600
- `/etc/raspberrypi.env`: 600
