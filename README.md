# Raspberry Pi Infrastructure Automation

Automated setup for Raspberry Pi 4B using Ansible. Installs Docker, configures Cloudflare Tunnel, sets up GitHub Actions runner, and manages secrets.

## Quick Start

### Prerequisites

- Raspberry Pi OS Lite (64-bit) installed
- Docker available on the target Raspberry Pi
- Ansible installed on the machine running the playbook
- For remote deployment: SSH access configured to the Raspberry Pi
- For local self-testing on the Pi itself: no SSH key is required when using `--local`

### Setup

1. **Configure services** (edit `iac-toolbox.yml` at the repository root):
   - Set Cloudflare tunnel name and domains
   - Configure optional features (Cloudflare Tunnel, GitHub Runner)

2. **Run install script:**

```bash
./scripts/install.sh
```

Secrets (API tokens, passwords) are injected as environment variables by the CLI from `~/.iac-toolbox/credentials`. Advanced users running `install.sh` directly can export the required variables before invoking the script.

`./scripts/setup.sh` remains as a compatibility wrapper.

3. **If using Cloudflare Tunnel** (manual step):

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

Configuration is split across two layers:

1. **`iac-toolbox.yml`** - Application settings (domains, ports, feature flags)
2. **Environment variables** - Secrets and connection details (injected by the CLI from `~/.iac-toolbox/credentials`)

### Configuration File Location

The `iac-toolbox.yml` file is automatically discovered in the following order:

1. Path specified by `IAC_TOOLBOX_CONFIG` environment variable (highest priority)
2. `iac-toolbox.yml` in the project root directory
3. `~/.iac-toolbox/iac-toolbox.yml` (user home directory)

To specify a custom location:

```bash
export IAC_TOOLBOX_CONFIG=/path/to/your/iac-toolbox.yml
./scripts/install.sh
```

If no configuration file is found, role defaults will be used (all services enabled).

## Usage

Common entry points:

```bash
./scripts/install.sh
./scripts/install.sh --vault
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

## Documentation

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) - Project architecture and overview
- [docs/01-vault-setup.md](docs/01-vault-setup.md) - HashiCorp Vault setup and usage guide
