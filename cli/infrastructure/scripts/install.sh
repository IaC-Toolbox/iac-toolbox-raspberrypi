#!/bin/bash

# ============================================
# IaC Toolbox Infrastructure Install Script
# ============================================
# Supports full deployment, targeted Ansible runs,
# and Terraform-only execution.

set -e

# Bootstrap Ansible if not already installed
if ! command -v ansible-playbook >/dev/null 2>&1; then
  case "$(uname -s)" in
    Darwin) bash "$(dirname "$0")/bootstrap/bootstrap-macos.sh" ;;
    Linux)  bash "$(dirname "$0")/bootstrap/bootstrap-debian.sh" ;;
    *)      echo "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAC_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$IAC_ROOT")"
ANSIBLE_DIR="$IAC_ROOT/ansible-configurations"
TERRAFORM_DIR="$IAC_ROOT/terraform/grafana-alerts"
echo $IAC_ROOT
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
    --vault)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="vault"
      shift
      ;;
    --cloudflared)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="cloudflare"
      shift
      ;;
    --grafana)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="grafana"
      shift
      ;;
    --prometheus)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="prometheus"
      shift
      ;;
    --metrics-agent)
      RUN_TERRAFORM=false
      ANSIBLE_TAGS="node_exporter,grafana-alloy"
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
      echo "  --vault            Deploy only HashiCorp Vault"
      echo "  --cloudflared      Deploy only Cloudflare tunnel"
      echo "  --grafana          Deploy only Grafana observability stack"
      echo "  --prometheus       Deploy only Prometheus metrics collection"
      echo "  --metrics-agent    Deploy only Node Exporter + Grafana Alloy"
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
echo -e "${GREEN}IaC Toolbox Infrastructure Install${NC}"
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

echo -e "${YELLOW}[1/4] Checking required tools...${NC}"
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

echo -e "${YELLOW}[2/4] Checking environment configuration...${NC}"
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  export RPI_LOCAL=true
else
  export RPI_LOCAL=false
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

echo -e "${YELLOW}[3/4] Validating required environment variables...${NC}"
# Only validate non-secret configuration variables required by install.sh
# Secret validation (GITHUB_REPO_URL, GITHUB_RUNNER_TOKEN, etc.) is delegated
# to Ansible roles, which will fail with clear errors if required variables are missing.
REQUIRED_VARS=()
if [ "$RPI_LOCAL" = false ]; then
  REQUIRED_VARS=("RPI_HOST" "RPI_USER")
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

if [ "$RUN_ANSIBLE" = true ]; then
  echo -e "${YELLOW}[4/4] Running Ansible playbook...${NC}"
  if [ "$RPI_LOCAL" = true ]; then
    echo -e "${YELLOW}Target: local machine as $RPI_USER${NC}"
  else
    echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
  fi

  # Build secret variables from environment (injected by CLI from ~/.iac-toolbox/credentials)
  # Ansible roles validate their required secrets and fail with clear errors if missing.
  SECRET_VARS=""
  SECRET_ENV_NAMES=(
    DOCKER_HUB_TOKEN DOCKER_HUB_USERNAME
    CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_ZONE_ID
    GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD
    GITHUB_RUNNER_TOKEN GITHUB_REPO_URL
    ALLOY_REMOTE_WRITE_URL
  )
  for var_name in "${SECRET_ENV_NAMES[@]}"; do
    if [ -n "${!var_name}" ]; then
      SECRET_VARS="${SECRET_VARS} ${var_name}=${!var_name}"
    fi
  done

  ANSIBLE_CMD=(ansible-playbook -i inventory/all.yml playbooks/main.yml)

  # Load iac-toolbox.yml configuration file
  # Priority: 1) IAC_TOOLBOX_CONFIG env var, 2) infrastructure/ folder, 3) ~/.iac-toolbox/
  IAC_CONFIG_FILE=""
  if [ -n "$IAC_TOOLBOX_CONFIG" ] && [ -f "$IAC_TOOLBOX_CONFIG" ]; then
    IAC_CONFIG_FILE="$IAC_TOOLBOX_CONFIG"
    echo -e "${GREEN}✓ Using configuration from IAC_TOOLBOX_CONFIG: $IAC_CONFIG_FILE${NC}"
  else
    for config_path in \
      "$PROJECT_ROOT/infrastructure/iac-toolbox.yml" \
      "$HOME/.iac-toolbox/iac-toolbox.yml"; do
      if [ -f "$config_path" ]; then
        IAC_CONFIG_FILE="$config_path"
        echo -e "${GREEN}✓ Found configuration file: $IAC_CONFIG_FILE${NC}"
        break
      fi
    done
  fi

  if [ -n "$IAC_CONFIG_FILE" ]; then
    ANSIBLE_CMD+=(--extra-vars "@$IAC_CONFIG_FILE")
  else
    echo -e "${YELLOW}⚠ No iac-toolbox.yml configuration file found. Using role defaults.${NC}"
  fi
  ANSIBLE_CMD+=(--extra-vars "project_root=${PROJECT_ROOT}")
  if [ -n "$SECRET_VARS" ]; then
    ANSIBLE_CMD+=(--extra-vars "$SECRET_VARS")
  fi
  if [ -n "$ANSIBLE_TAGS" ]; then
    ANSIBLE_CMD+=(--tags "$ANSIBLE_TAGS")
  fi

  (
    cd "$ANSIBLE_DIR"
    "${ANSIBLE_CMD[@]}"
  )
  echo -e "${GREEN}✓ Ansible run completed${NC}"
else
  echo -e "${YELLOW}[4/4] Skipping Ansible playbook (--terraform-only)${NC}"
fi
echo ""

if [ "$RUN_TERRAFORM" = true ]; then
  echo -e "${YELLOW}Running Terraform...${NC}"

  if [ -z "$GRAFANA_ADMIN_USER" ] || [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ -z "$ALERT_EMAIL" ]; then
    echo -e "${RED}Error: Missing required variables for Terraform${NC}"
    echo "Please ensure these environment variables are set:"
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
  echo -e "${YELLOW}Skipping Terraform execution${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Install completed successfully${NC}"
echo -e "${GREEN}========================================${NC}"
