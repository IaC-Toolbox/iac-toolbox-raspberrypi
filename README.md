# Raspberry Pi Infrastructure Automation

Automated setup for Raspberry Pi 4B using Ansible. Installs Docker, configures Cloudflare Tunnel, sets up GitHub Actions runner, and manages secrets.

hello from here 2

## Quick Start

### Prerequisites

- Raspberry Pi OS Lite (64-bit) installed
- Docker available on the target Raspberry Pi
- Ansible installed on the machine running the playbook
- For remote deployment: SSH access configured to the Raspberry Pi
- For local self-testing on the Pi itself: no SSH key is required when using `--local`

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

3. **Run install script:**

```bash
./scripts/install.sh
```

`./scripts/setup.sh` remains as a compatibility wrapper.

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
- **Secrets** - Managed via HashiCorp Vault

## Configuration

Configuration is split across three layers:

1. **`.env`** - Connection details (RPI_HOST, RPI_USER, GITHUB_RUNNER_TOKEN)
2. **`inventory/group_vars/all.yml`** - Application settings (domains, ports, feature flags)
3. **`secrets.yml`** - Encrypted secrets (API keys, passwords)

## Usage

Common entry points:

```bash
./scripts/install.sh
./scripts/install.sh --vault
./scripts/install.sh --assistant
./scripts/install.sh --ansible-only
./scripts/install.sh --terraform-only
```

Self-test against the same Raspberry Pi running the repo:

```bash
./scripts/install.sh --vault --local
./scripts/uninstall-vault.sh --local
```

Run specific components directly with Ansible:

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
./scripts/install.sh --vault
```

Or, when testing directly on the target Pi itself:

```bash
./scripts/install.sh --vault --local
```

After deployment:
- Access Vault UI at: `https://vault.iac-toolbox.com`
- Root token and unseal key are displayed in Ansible output
- Credentials saved to: `~/vault/data/vault-init.json` on Raspberry Pi
- Vault is automatically unsealed by the playbook before KV and audit setup continue

**Cleanup Vault (if needed):**

```bash
./scripts/uninstall-vault.sh
```

Or locally on the Pi:

```bash
./scripts/uninstall-vault.sh --local
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

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) - Project architecture and overview
- [docs/01-vault-setup.md](docs/01-vault-setup.md) - HashiCorp Vault setup and usage guide
