#!/bin/bash

# ============================================
# Raspberry Pi Infrastructure Install Script
# ============================================
# Supports full deployment, targeted Ansible runs,
# and Terraform-only execution.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ANSIBLE_DIR="$PROJECT_ROOT/ansible-configurations"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/grafana-alerts"

RUN_ANSIBLE=true
RUN_TERRAFORM=true
ANSIBLE_TAGS=""
RPI_LOCAL_MODE="${RPI_LOCAL:-false}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --ansible-only)
      RUN_TERRAFORM=false
      shift
      ;;
    --terraform-only)
      RUN_ANSIBLE=false
      shift
      ;;
    --assistant)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="assistant"
      shift
      ;;
    --vault)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="vault"
      shift
      ;;
    --local)
      RPI_LOCAL_MODE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --ansible-only     Run only Ansible playbook (infrastructure)"
      echo "  --terraform-only   Run only Terraform (Grafana alerts)"
      echo "  --assistant        Deploy only OpenClaw AI Assistant service"
      echo "  --vault            Deploy only HashiCorp Vault"
      echo "  --local            Run Ansible locally on this machine instead of SSH"
      echo "  -h, --help         Show this help message"
      echo ""
      echo "Default: Run both Ansible and Terraform"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Raspberry Pi Infrastructure Install${NC}"
echo -e "${GREEN}========================================${NC}"
if [ "$RUN_ANSIBLE" = false ]; then
  echo -e "${YELLOW}Mode: Terraform only (--terraform-only)${NC}"
elif [ -n "$ANSIBLE_TAGS" ]; then
  echo -e "${YELLOW}Mode: Ansible with tags: $ANSIBLE_TAGS${NC}"
elif [ "$RUN_TERRAFORM" = false ]; then
  echo -e "${YELLOW}Mode: Ansible only (--ansible-only)${NC}"
else
  echo -e "${YELLOW}Mode: Full deployment (Ansible + Terraform)${NC}"
fi
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  echo -e "${YELLOW}Target mode: local (--local)${NC}"
fi
echo ""

echo -e "${YELLOW}[1/7] Checking required tools...${NC}"
REQUIRED_COMMANDS=(openssl)
for cmd in "${REQUIRED_COMMANDS[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}Error: Required command not found: $cmd${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ Core tools found${NC}"

if [ "$RUN_ANSIBLE" = true ]; then
  if ! command -v ansible-playbook >/dev/null 2>&1; then
    echo -e "${RED}Error: ansible-playbook is not installed${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Ansible found${NC}"
fi

if [ "$RUN_TERRAFORM" = true ]; then
  if ! command -v terraform >/dev/null 2>&1; then
    echo -e "${RED}Error: terraform is not installed${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Terraform found${NC}"
fi
echo ""

echo -e "${YELLOW}[2/7] Checking environment configuration...${NC}"
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create $PROJECT_ROOT/.env from ansible-configurations/.env.example or your own config"
  exit 1
fi

set -a
source "$PROJECT_ROOT/.env"
set +a

if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  export RPI_LOCAL=true
else
  export RPI_LOCAL=false
fi

echo -e "${GREEN}✓ .env file found${NC}"
echo ""

echo -e "${YELLOW}[3/7] Validating required environment variables...${NC}"
REQUIRED_VARS=("RPI_HOST" "RPI_USER")
if [ "$RUN_ANSIBLE" = true ] && [ "$ANSIBLE_TAGS" != "vault" ]; then
  REQUIRED_VARS+=("GITHUB_REPO_URL" "GITHUB_RUNNER_TOKEN")
fi

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}Error: Missing required environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo -e "${GREEN}✓ Required variables present${NC}"
echo ""

echo -e "${YELLOW}[4/7] Installing required Ansible collections...${NC}"
if [ "$RUN_ANSIBLE" = true ] && [ -f "$ANSIBLE_DIR/requirements.yml" ]; then
  (
    cd "$ANSIBLE_DIR"
    ansible-galaxy collection install -r requirements.yml
  )
  echo -e "${GREEN}✓ Ansible collections ready${NC}"
else
  echo -e "${GREEN}✓ No Ansible collections to install${NC}"
fi
echo ""

echo -e "${YELLOW}[5/7] Ensuring Ansible Vault password exists...${NC}"
VAULT_PASS_FILE="$ANSIBLE_DIR/.vault_pass.txt"
if [ ! -f "$VAULT_PASS_FILE" ]; then
  echo "Generating vault password..."
  openssl rand -base64 32 > "$VAULT_PASS_FILE"
  chmod 600 "$VAULT_PASS_FILE"
  echo -e "${GREEN}✓ Vault password generated${NC}"
else
  echo -e "${GREEN}✓ Vault password already exists${NC}"
fi
echo ""

echo -e "${YELLOW}[6/7] Ensuring encrypted secrets exist...${NC}"
if [ ! -f "$ANSIBLE_DIR/secrets.yml" ]; then
  echo "Creating encrypted secrets..."
  (
    cd "$ANSIBLE_DIR"
    ansible-playbook playbooks/seed_vault.yml
  )
  echo -e "${GREEN}✓ Secrets encrypted${NC}"
else
  echo -e "${GREEN}✓ Encrypted secrets already exist${NC}"
fi
echo ""

if [ "$RUN_ANSIBLE" = true ]; then
  echo -e "${YELLOW}[7/7] Running Ansible playbook...${NC}"
  if [ "$RPI_LOCAL" = true ]; then
    echo -e "${YELLOW}Target: local machine as $RPI_USER${NC}"
  else
    echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
  fi

  ANSIBLE_CMD=(ansible-playbook -i inventory/all.yml playbooks/main.yml --vault-password-file "$VAULT_PASS_FILE")
  if [ -n "$ANSIBLE_TAGS" ]; then
    ANSIBLE_CMD+=(--tags "$ANSIBLE_TAGS")
  fi

  (
    cd "$ANSIBLE_DIR"
    "${ANSIBLE_CMD[@]}"
  )
  echo -e "${GREEN}✓ Ansible run completed${NC}"
else
  echo -e "${YELLOW}[7/7] Skipping Ansible playbook (--terraform-only)${NC}"
fi
echo ""

if [ "$RUN_TERRAFORM" = true ]; then
  echo -e "${YELLOW}[7/7] Running Terraform...${NC}"

  if [ -z "$GRAFANA_ADMIN_USER" ] || [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ -z "$ALERT_EMAIL" ]; then
    echo -e "${RED}Error: Missing required variables for Terraform${NC}"
    echo "Please ensure these are set in $PROJECT_ROOT/.env:"
    echo "  - GRAFANA_ADMIN_USER"
    echo "  - GRAFANA_ADMIN_PASSWORD"
    echo "  - ALERT_EMAIL"
    exit 1
  fi

  (
    cd "$TERRAFORM_DIR"
    cat > terraform.tfvars <<EOF
grafana_url            = "https://grafana.iac-toolbox.com"
grafana_admin_user     = "${GRAFANA_ADMIN_USER}"
grafana_admin_password = "${GRAFANA_ADMIN_PASSWORD}"
alert_email            = "${ALERT_EMAIL}"
pagerduty_token          = "${PAGERDUTY_TOKEN:-}"
pagerduty_service_region = "${PAGERDUTY_SERVICE_REGION:-us}"
pagerduty_user_email     = "${PAGERDUTY_USER_EMAIL:-}"
EOF
    terraform init
    terraform apply -auto-approve
  )

  echo -e "${GREEN}✓ Terraform completed${NC}"
else
  echo -e "${YELLOW}[7/7] Skipping Terraform execution${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Install completed successfully${NC}"
echo -e "${GREEN}========================================${NC}"
