# Feature Plan: HashiCorp Vault Setup via Ansible

## Overview

Add automated HashiCorp Vault deployment to the Raspberry Pi infrastructure using a new Ansible role. This replaces the manual secrets management approach (`/etc/raspberrypi.env`) with a production-grade secrets management system accessible via Cloudflare tunnel at `vault.iac-toolbox.com`.

## Problem Being Solved

**Current State:**

- Secrets stored in plain text at `/etc/raspberrypi.env`
- No audit logging of secret access
- No versioning of secret changes
- Manual deployment process for secret updates
- No centralized secrets UI

**Desired State:**

- Secrets encrypted at rest in Vault
- Secrets fetched on-demand via API
- Audit logging for all access
- Version control for secrets
- Web UI accessible at `vault.iac-toolbox.com:8200`
- Fully automated deployment via Ansible

## Architecture

```
┌─────────────────────────────────────────┐
│      Raspberry Pi                       │
│  ┌──────────────────────────────────┐   │
│  │  Vault (Docker)                  │   │
│  │  - Internal: localhost:8200      │   │
│  │  - Data: /home/user/vault/data   │◄──┼─── Cloudflare Tunnel
│  │  - Auto-unseal on boot           │   │     vault.iac-toolbox.com:8200
│  └──────────────────────────────────┘   │
│           ▲                              │
│           │ Fetch secrets at runtime     │
│  ┌────────┴──────────┐                   │
│  │  Docker Apps      │                   │
│  └───────────────────┘                   │
└─────────────────────────────────────────┘
```

## Implementation Approach

### 1. New Ansible Role: `vault`

Create `ansible-configurations/playbooks/roles/vault/` with the following structure:

```
roles/vault/
├── tasks/
│   └── main.yml           # Main deployment tasks
├── templates/
│   ├── vault.hcl.j2       # Vault server configuration
│   ├── docker-compose.yml.j2
│   └── auto-unseal.sh.j2  # Unsealing script
├── defaults/
│   └── main.yml           # Default variables
└── handlers/
    └── main.yml           # Service restart handlers
```

### 2. Configuration Variables

Add to `inventory/group_vars/all.yml`:

```yaml
vault:
  enabled: true
  version: "latest" # Docker image tag
  base_dir: "/home/{{ ansible_user }}/vault"
  port: 8200
  # Data will be stored at: {{ vault.base_dir }}/data
  # Config at: {{ vault.base_dir }}/config
  # Credentials at: {{ vault.base_dir }}/data/vault-init.json
```

### 3. Cloudflare Domain Configuration

Update `cloudflare.domains` in `inventory/group_vars/all.yml`:

```yaml
cloudflare:
  enabled: true
  tunnel_name: main-backend-tunnel
  domains:
    - hostname: api.iac-toolbox.com
      service_port: 80
    - hostname: vault.iac-toolbox.com # NEW
      service_port: 8200 # NEW
```

### 4. Docker Compose Setup

The role will deploy Vault using Docker Compose with two services:

**Service 1: `vault`**

- Runs HashiCorp Vault server
- Exposes port 8200 internally
- Mounts: config, data, logs directories
- Health check: `vault status`
- Restart policy: unless-stopped

**Service 2: `vault-unsealer`**

- Runs once after vault service is healthy
- Uses docker-compose profile: `unseal`
- Automatically initializes Vault on first run
- Unseals Vault using stored unseal key
- Stores credentials in `{{ vault.base_dir }}/data/vault-init.json`

### 5. Auto-Unseal on Boot Strategy

**Docker Compose Profile Approach:**

- Main service starts automatically via systemd
- Unseal service runs via docker-compose profile
- Systemd service runs: `docker-compose --profile unseal up vault-unsealer`
- No separate unsealer container running permanently

**Systemd Units:**

`/etc/systemd/system/vault.service`:

- Starts Vault container on boot
- Dependency: docker.service

`/etc/systemd/system/vault-unseal.service`:

- Runs after vault.service
- Executes: `docker-compose --profile unseal run --rm vault-unsealer`
- Type: oneshot (runs once and exits)

### 6. Credentials Management

**On First Run:**

1. Vault initializes with 1 key share, threshold 1
2. Generates root token and unseal key
3. Stores in: `{{ vault.base_dir }}/data/vault-init.json`
4. File permissions: `600` (owner read/write only)
5. Ansible displays credentials in task output for user to save

**On Subsequent Runs:**

- Reads unseal key from vault-init.json
- Automatically unseals if sealed
- No manual intervention needed

### 7. Vault Configuration

**vault.hcl Template:**

```hcl
ui = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

storage "file" {
  path = "/vault/data"
}

api_addr = "http://0.0.0.0:8200"
disable_mlock = true
```

**Key Settings:**

- `tls_disable = 1`: TLS handled by Cloudflare tunnel
- `ui = true`: Enable web interface
- `storage "file"`: Persistent file-based storage
- `disable_mlock = true`: Required for Docker/Raspberry Pi

## Ansible Role Tasks (roles/vault/tasks/main.yml)

### Task Sequence:

1. **Create directories**
   - `{{ vault.base_dir }}`
   - `{{ vault.base_dir }}/config`
   - `{{ vault.base_dir }}/data`
   - `{{ vault.base_dir }}/logs`
   - `{{ vault.base_dir }}/scripts`
   - Owner: `{{ ansible_user }}`
   - Permissions: `0755` (directories), `0700` (data directory)

2. **Deploy configuration files**
   - Template: `vault.hcl.j2` → `config/vault.hcl`
   - Template: `docker-compose.yml.j2` → `docker-compose.yml`
   - Template: `auto-unseal.sh.j2` → `scripts/auto-unseal.sh` (mode: `0755`)

3. **Start Vault container**
   - Use: `community.docker.docker_compose`
   - Project src: `{{ vault.base_dir }}`
   - State: present
   - Pull: yes (ensure latest image)

4. **Wait for Vault health check**
   - Command: `docker inspect --format='{{.State.Health.Status}}' vault`
   - Until: status == "healthy"
   - Retries: 30, delay: 2s

5. **Run auto-unseal**
   - Command: `docker-compose --profile unseal run --rm vault-unsealer`
   - Working dir: `{{ vault.base_dir }}`
   - Register output

6. **Display credentials**
   - Parse vault-init.json if newly created
   - Display root token and unseal key
   - Save to Ansible output for user

7. **Create systemd services**
   - Template: `vault.service` → `/etc/systemd/system/`
   - Template: `vault-unseal.service` → `/etc/systemd/system/`
   - Enable both services
   - Handler: reload systemd daemon

8. **Verify Vault status**
   - Command: `docker exec vault vault status`
   - Display status to confirm unsealed

9. **Enable KV Secrets Engine**
   - Command: `docker exec -e VAULT_TOKEN=$(cat vault-init.json | jq -r .root_token) vault vault secrets enable -version=2 -path=kv kv`
   - Only run if not already enabled

10. **Enable Audit Logging**

- Command: `docker exec -e VAULT_TOKEN=$(cat vault-init.json | jq -r .root_token) vault vault audit enable file file_path=/vault/logs/audit.log`
- Creates audit trail for all operations

## Files Created/Modified

### File Structure:

```
ansible-configurations/
├── playbooks/
│   ├── main.yml                                    # MODIFIED: Added vault role
│   └── roles/
│       └── vault/                                  # NEW ROLE
│           ├── defaults/
│           │   └── main.yml                        # Default variables
│           ├── handlers/
│           │   └── main.yml                        # Service restart handlers
│           ├── meta/
│           │   └── main.yml                        # Docker dependency
│           ├── tasks/
│           │   └── main.yml                        # Main deployment tasks
│           └── templates/
│               ├── auto-unseal.sh.j2               # Auto-unseal script
│               ├── docker-compose.yml.j2           # Docker Compose v3.8
│               ├── vault-unseal.service.j2         # Systemd unseal service
│               ├── vault.hcl.j2                    # Vault server config
│               └── vault.service.j2                # Systemd vault service
└── inventory/
    └── group_vars/
        └── all.yml                                 # MODIFIED: Added vault config
```

### File Details:

**New Files:**

1. **`roles/vault/defaults/main.yml`**
   - Default variables: version: "latest", enable_kv: true, enable_audit: true

2. **`roles/vault/meta/main.yml`**
   - Role dependencies: depends on docker role

3. **`roles/vault/handlers/main.yml`**
   - Handlers for restarting vault service and reloading systemd

4. **`roles/vault/tasks/main.yml`**
   - Creates vault directories (base_dir, config, data, logs, scripts)
   - Deploys configuration files from templates
   - Starts vault container via docker-compose
   - Runs auto-unseal script
   - Enables KV secrets engine
   - Enables audit logging
   - Creates and enables systemd services

5. **`roles/vault/templates/vault.hcl.j2`**
   - Vault server configuration (UI enabled, TLS disabled, file storage)

6. **`roles/vault/templates/docker-compose.yml.j2`**
   - Two services: vault (main) and vault-unsealer (profile: unseal)
   - No version field (obsolete in docker compose v2)

7. **`roles/vault/templates/auto-unseal.sh.j2`**
   - Initializes Vault on first run, unseals on subsequent runs

8. **`roles/vault/templates/vault.service.j2`**
   - Systemd service to start/stop vault container

9. **`roles/vault/templates/vault-unseal.service.j2`**
   - Systemd service to auto-unseal vault on boot

**Modified Files:**

1. **`inventory/group_vars/all.yml`**
   - Added vault configuration block
   - Added `vault.iac-toolbox.com:8200` to cloudflare.domains

2. **`playbooks/main.yml`**
   - Added vault role with tags: `[vault, secrets]`
   - Updated post_tasks completion message to include vault info

## Testing & Verification Steps

### Local Testing (Before Deployment):

1. Validate YAML syntax:

   ```bash
   ansible-playbook --syntax-check playbooks/main.yml
   ```

2. Dry run:
   ```bash
   ansible-playbook -i inventory/all.yml playbooks/main.yml --tags vault --check
   ```

### Deployment Testing:

1. Deploy vault role:

   ```bash
   ansible-playbook -i inventory/all.yml playbooks/main.yml --tags vault
   ```

2. Verify container running:

   ```bash
   ssh pi@raspberrypi 'docker ps | grep vault'
   ```

3. Check Vault status:

   ```bash
   ssh pi@raspberrypi 'docker exec vault vault status'
   ```

   Expected output: `Sealed: false`

4. Access UI locally:
   - Navigate to: `http://<pi-ip>:8200`
   - Login with root token from Ansible output

5. Test Cloudflare tunnel:
   - Navigate to: `https://vault.iac-toolbox.com`
   - Should reach Vault UI

6. Test reboot persistence:
   ```bash
   ssh pi@raspberrypi 'sudo reboot'
   # Wait 2 minutes
   ssh pi@raspberrypi 'docker exec vault vault status'
   ```
   Expected: Auto-unsealed after boot

### Post-Deployment Verification:

1. Verify KV secrets engine enabled:

   ```bash
   docker exec vault vault secrets list
   ```

   Expected: `kv/` listed with type `kv`

2. Store test secret:

   ```bash
   docker exec -e VAULT_TOKEN=<root-token> vault \
     vault kv put kv/test message="Hello from Vault"
   ```

3. Retrieve test secret:
   ```bash
   docker exec -e VAULT_TOKEN=<root-token> vault \
     vault kv get kv/test
   ```

## Security Considerations

### Credential Storage:

- Root token and unseal key stored in `vault-init.json`
- File permissions: `600` (only owner can read)
- Owner: `{{ ansible_user }}`
- **User must backup this file securely off-device**

### Network Security:

- Vault only listens on localhost:8200
- External access via Cloudflare tunnel only
- No TLS on Vault itself (Cloudflare provides encryption)
- Cloudflare tunnel requires authentication

### Auto-Unseal Security:

- Unseal key stored on same device as Vault data
- Acceptable for homelab/development use
- For production: Consider cloud auto-unseal (AWS KMS, etc.)

### Token Management:

- Root token should not be used by applications
- Create limited tokens with specific policies
- Set TTLs on application tokens
- Rotate tokens regularly

### Backup Strategy:

- Backup `{{ vault.base_dir }}/data/` directory
- Include `vault-init.json` in backups
- Store backups encrypted off-device
- Test restore procedure

## Implementation Checklist

- [ ] Create vault role directory structure
- [ ] Write `tasks/main.yml` with all deployment tasks
- [ ] Create `vault.hcl.j2` template
- [ ] Create `docker-compose.yml.j2` template
- [ ] Create `auto-unseal.sh.j2` template
- [ ] Create systemd service templates
- [ ] Write `defaults/main.yml` with default variables
- [ ] Write `handlers/main.yml` for service restarts
- [ ] Update `inventory/group_vars/all.yml` with vault config
- [ ] Update `inventory/group_vars/all.yml` with cloudflare domain
- [ ] Update `playbooks/main.yml` to include vault role
- [ ] Test deployment on Raspberry Pi
- [ ] Verify auto-unseal after reboot
- [ ] Test Cloudflare tunnel access
- [ ] Document root token and unseal key storage
- [ ] Create backup procedure documentation

## Success Criteria

1. ✅ Vault container runs successfully
2. ✅ Vault automatically unseals on boot
3. ✅ Web UI accessible at `https://vault.iac-toolbox.com`
4. ✅ Root token and unseal key displayed in Ansible output
5. ✅ Credentials stored securely in `vault-init.json`
6. ✅ Systemd services enabled and working
7. ✅ Can store and retrieve secrets via UI/CLI
8. ✅ Survives Raspberry Pi reboot
9. ✅ KV secrets engine enabled automatically
10. ✅ Audit logging enabled

## Creating Your First Secret

### Understanding Secret Paths

The KV secrets engine is mounted at `kv/`. When you create secrets, you organize them by path:

**Path Structure:**

```
kv/                          <- Secrets engine mount point
├── myapp/                   <- Application or service name
│   ├── production           <- Environment or config set
│   ├── staging
│   └── development
├── database/
│   └── credentials
└── api-keys/
    ├── github
    └── openai
```

**Important:**

- In the UI, you navigate to `kv/myapp/production`
- In the API/CLI, you use `kv/data/myapp/production` (note the `/data/` prefix for KV v2)
- In GitHub Actions with hashicorp/vault-action, you use `kv/data/myapp/production`

### Create Secret via Web UI

1. Navigate to `https://vault.iac-toolbox.com`
2. Login with your root token
3. Click on **`kv/`** secrets engine
4. Click **"Create secret +"**
5. Set **Path**: `myapp/production` (or your preferred path)
6. Add key-value pairs:
   - Key: `DOCKER_USERNAME`, Value: `your-username`
   - Key: `DOCKER_PASSWORD`, Value: `your-password`
   - Key: `API_KEY`, Value: `your-api-key`
7. Click **"Save"**

**Your secret is now at:** `kv/myapp/production`

### Create Secret via CLI

SSH to your Raspberry Pi and run:

```bash
# Set your root token
export VAULT_TOKEN="hvs.YOUR_ROOT_TOKEN_HERE"

# Create secret
docker exec -e VAULT_TOKEN=$VAULT_TOKEN vault \
  vault kv put kv/myapp/production \
    DOCKER_USERNAME=your-username \
    DOCKER_PASSWORD=your-password \
    API_KEY=your-api-key
```

### Retrieve Secret to Verify

```bash
# Get all keys
docker exec -e VAULT_TOKEN=$VAULT_TOKEN vault \
  vault kv get kv/myapp/production

# Get specific key
docker exec -e VAULT_TOKEN=$VAULT_TOKEN vault \
  vault kv get -field=API_KEY kv/myapp/production
```

### Recommended Path Organization

```
kv/
├── <app-name>/
│   ├── production       <- Production environment secrets
│   ├── staging          <- Staging environment secrets
│   └── development      <- Development environment secrets
└── shared/
    ├── docker-registry  <- Shared Docker credentials
    └── common-api-keys  <- API keys used by multiple apps
```

## Using Secrets in Docker Applications

### Create Application Policy

Create a limited policy for your application (don't use root token):

```bash
# SSH to Raspberry Pi
ssh pi@raspberrypi

# Create policy
docker exec -e VAULT_TOKEN=<root-token> vault vault policy write myapp-policy - <<EOF
path "kv/data/myapp/*" {
  capabilities = ["read"]
}
EOF

# Create token with policy
docker exec -e VAULT_TOKEN=<root-token> vault \
  vault token create \
  -policy=myapp-policy \
  -ttl=720h \
  -display-name="myapp-deployment"
```

Save the generated token as `VAULT_TOKEN` in GitHub Secrets.

### Store Secrets in Vault

Via UI at `https://vault.iac-toolbox.com`:

1. Navigate to `kv/` secrets engine
2. Click "Create secret"
3. Path: `myapp/production`
4. Add your secrets:
   - `DOCKER_USERNAME`: your-username
   - `DOCKER_PASSWORD`: your-password
   - `API_KEY`: your-api-key
5. Click "Save"

### GitHub Actions Workflow Integration

Update your workflow to fetch secrets from Vault:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build_docker_image:
    runs-on: [self-hosted, ARM64]
    outputs:
      tag: ${{ steps.set_tag.outputs.tag }}
    steps:
      - name: Check out the repo
        uses: actions/checkout@v4

      # NEW: Fetch secrets from Vault
      - name: Import Secrets from Vault
        id: secrets
        uses: hashicorp/vault-action@v2.4.0
        with:
          url: http://localhost:8200
          token: ${{ secrets.VAULT_TOKEN }}
          secrets: |
            kv/data/myapp/production DOCKER_USERNAME | DOCKER_USERNAME ;
            kv/data/myapp/production DOCKER_PASSWORD | DOCKER_PASSWORD

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ env.DOCKER_USERNAME }}
          password: ${{ env.DOCKER_PASSWORD }}

      - name: Build and Push Container Image
        run: |
          TAG=${{ github.sha }}
          docker build -f ./Dockerfile -t ${{ env.DOCKER_USERNAME }}/vvasylkovskyi-bark-gpt-api:$TAG .
          docker push ${{ env.DOCKER_USERNAME }}/vvasylkovskyi-bark-gpt-api:$TAG

      - name: Set output tag
        id: set_tag
        run: echo "tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"

  deploy:
    runs-on: [self-hosted, ARM64]
    needs: build_docker_image
    steps:
      # NEW: Fetch secrets from Vault
      - name: Import Secrets from Vault
        id: secrets
        uses: hashicorp/vault-action@v2.4.0
        with:
          url: http://localhost:8200
          token: ${{ secrets.VAULT_TOKEN }}
          secrets: |
            kv/data/myapp/production DOCKER_USERNAME | DOCKER_USERNAME ;
            kv/data/myapp/production API_KEY | API_KEY

      - name: Stop existing container
        run: |
          docker stop my-app || true
          docker rm my-app || true

      - name: Pull and run new container
        run: |
          TAG=${{ needs.build_docker_image.outputs.tag }}
          docker pull ${{ env.DOCKER_USERNAME }}/vvasylkovskyi-bark-gpt-api:$TAG
          docker run -d \
            --name my-app \
            -p 80:80 \
            -e API_KEY=${{ env.API_KEY }} \
            --restart unless-stopped \
            ${{ env.DOCKER_USERNAME }}/vvasylkovskyi-bark-gpt-api:$TAG
```

**Key Changes:**

1. Added `hashicorp/vault-action@v2.4.0` step to fetch secrets
2. Secrets are exported as environment variables
3. Use `${{ env.VAR_NAME }}` instead of `${{ secrets.VAR_NAME }}`
4. Vault runs on `localhost:8200` (on the self-hosted runner)
5. Use application-specific token, not root token

**Important Notes:**

- **Semicolons are required** when fetching multiple secrets - each line except the last must end with `;`
- Without semicolons, the vault-action will treat all lines as a single malformed path
- The path format is: `kv/data/<your-path> <KEY_NAME> | ENV_VAR_NAME`
- Replace `<your-path>` with where you stored the secret (e.g., `production`, `myapp/production`)

## Summary

This feature adds enterprise-grade secrets management to the Raspberry Pi infrastructure through automated Vault deployment. The implementation uses:

- **Ansible** for full automation
- **Docker Compose v2** with profiles for unsealing
- **Systemd** for auto-unseal on boot
- **Cloudflare tunnel** for secure remote access at `vault.iac-toolbox.com`
- **HashiCorp Vault** (latest version) with KV v2 secrets engine and audit logging enabled by default

Applications fetch secrets at runtime via the Vault API, eliminating plain-text secret files. The web UI provides easy secrets management, versioning, and audit trails. GitHub Actions integration allows CI/CD pipelines to securely retrieve secrets using limited-scope tokens.
