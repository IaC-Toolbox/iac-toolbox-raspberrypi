# Raspberry Pi Infrastructure Automation

Automated setup for Raspberry Pi 4B using Ansible. Installs Docker, configures Cloudflare Tunnel, sets up GitHub Actions runner, and manages secrets.

## Quick Start

### Prerequisites

- Raspberry Pi OS Lite (64-bit) installed
- SSH access configured from your Mac
- Homebrew installed on Mac

### Setup

1. **Configure environment:**

```bash
cd ansible-configurations
cp .env.example .env
# Edit .env with your Raspberry Pi connection details and GitHub runner token
```

2. **Configure services** (edit `ansible-configurations/group_vars/all.yml`):
   - Set Cloudflare tunnel name and domains
   - Enable/disable features as needed

3. **Run setup script:**

```bash
./scripts/setup.sh
```

4. **If using Cloudflare Tunnel** (manual step):

```bash
ssh pi@raspberrypi.local
cloudflared tunnel login
# Then re-run: ansible-playbook -i inventory/all.yml playbooks/main.yml --tags cloudflare
```

## What Gets Installed

- **Docker Engine** - Container runtime with Docker Compose
- **Cloudflare Tunnel** - Secure external access (optional)
- **GitHub Actions Runner** - Self-hosted ARM64 runner
- **Secrets** - Deployed to `/etc/raspberrypi.env`

## Configuration

Configuration is split across three layers:

1. **`.env`** - Connection details (RPI_HOST, RPI_USER, GITHUB_RUNNER_TOKEN)
2. **`group_vars/all.yml`** - Application settings (domains, ports, feature flags)
3. **`secrets.yml`** - Encrypted secrets (API keys, passwords)

## Usage

Run specific components:

```bash
cd ansible-configurations
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags docker
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags github-runner
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags cloudflare
```

Update secrets:

```bash
cd ansible-configurations
rm secrets.yml
export $(grep -v '^#' .env | xargs)
ansible-playbook playbooks/seed_vault.yml
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags secrets
```

## Documentation

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for detailed documentation, architecture, and troubleshooting.
