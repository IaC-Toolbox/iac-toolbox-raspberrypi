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

2. **Configure services** (edit `ansible-configurations/inventory/group_vars/all.yml`):
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
- **HashiCorp Vault** - Secrets management with auto-unseal
- **Cloudflare Tunnel** - Secure external access (optional)
- **GitHub Actions Runner** - Self-hosted ARM64 runner
- **Secrets** - Managed via Vault or deployed to `/etc/raspberrypi.env`

## Configuration

Configuration is split across three layers:

1. **`.env`** - Connection details (RPI_HOST, RPI_USER, GITHUB_RUNNER_TOKEN)
2. **`inventory/group_vars/all.yml`** - Application settings (domains, ports, feature flags)
3. **`secrets.yml`** - Encrypted secrets (API keys, passwords)

## Usage

Run specific components:

```bash
cd ansible-configurations
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags docker
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags vault
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags github-runner
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags cloudflare
```

### Vault Deployment

Deploy HashiCorp Vault for secrets management:

```bash
cd ansible-configurations
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags vault
```

After deployment:
- Access Vault UI at: `https://vault.iac-toolbox.com`
- Root token and unseal key are displayed in Ansible output
- Credentials saved to: `~/vault/data/vault-init.json` on Raspberry Pi

**Cleanup Vault (if needed):**

```bash
ssh pi@raspberrypi
cd ~/vault && docker compose down && sudo rm -rf data && mkdir -p data && sudo chown 100:1000 data
```

Then re-run the Ansible playbook to redeploy with fresh initialization.

Update secrets:

```bash
cd ansible-configurations
rm secrets.yml
export $(grep -v '^#' .env | xargs)
ansible-playbook playbooks/seed_vault.yml
ansible-playbook -i inventory/all.yml playbooks/main.yml --tags secrets
```

## Documentation

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) - Project architecture and overview
- [docs/01-vault-setup.md](docs/01-vault-setup.md) - HashiCorp Vault setup and usage guide
