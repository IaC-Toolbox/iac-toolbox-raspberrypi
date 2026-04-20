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

# ============================================
# Logging Functions
# ============================================

# Emit timestamped debug logs to stderr for CLI capture
log_debug() {
  local message="$1"
  echo "[DEBUG $(date '+%Y-%m-%d %H:%M:%S')] $message" >&2
}

# Mask secret values in strings for logging
mask_secrets() {
  local input="$1"
  local output="$input"

  # List of secret variable names to mask
  local secret_patterns=(
    "DOCKER_HUB_TOKEN"
    "CLOUDFLARE_API_TOKEN"
    "GRAFANA_ADMIN_PASSWORD"
    "GITHUB_RUNNER_TOKEN"
    "PAGERDUTY_TOKEN"
  )

  for pattern in "${secret_patterns[@]}"; do
    # Match pattern=value and replace value with ***
    output=$(echo "$output" | sed -E "s/${pattern}=[^ ]*/${pattern}=***/g")
  done

  echo "$output"
}

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

log_debug "========================================="
log_debug "Install script started"
log_debug "Script directory: $SCRIPT_DIR"
log_debug "Project root: $PROJECT_ROOT"
log_debug "RUN_ANSIBLE: $RUN_ANSIBLE"
log_debug "RUN_TERRAFORM: $RUN_TERRAFORM"
log_debug "ANSIBLE_TAGS: ${ANSIBLE_TAGS:-none}"
log_debug "RPI_LOCAL_MODE: $RPI_LOCAL_MODE"
log_debug "========================================="

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
REQUIRED_VARS=("RPI_HOST" "RPI_USER")
if [ "$RUN_ANSIBLE" = true ] && [ "$ANSIBLE_TAGS" != "vault" ]; then
  REQUIRED_VARS+=("GITHUB_REPO_URL" "GITHUB_RUNNER_TOKEN")
fi

log_debug "Checking required variables: ${REQUIRED_VARS[*]}"

MISSING_VARS=()
PRESENT_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    log_debug "Variable $var: MISSING"
  else
    PRESENT_VARS+=("$var")
    log_debug "Variable $var: present"
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  log_debug "Validation failed: ${#MISSING_VARS[@]} variable(s) missing"
  echo -e "${RED}Error: Missing required environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

log_debug "All required variables present: ${PRESENT_VARS[*]}"
echo -e "${GREEN}✓ Required variables present${NC}"
echo ""

if [ "$RUN_ANSIBLE" = true ]; then
  echo -e "${YELLOW}[4/4] Running Ansible playbook...${NC}"
  if [ "$RPI_LOCAL" = true ]; then
    echo -e "${YELLOW}Target: local machine as $RPI_USER${NC}"
    log_debug "Ansible target mode: local execution as user $RPI_USER"
  else
    echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
    log_debug "Ansible target mode: remote execution on $RPI_USER@$RPI_HOST"
  fi

  # Build secret variables from environment (injected by CLI from ~/.iac-toolbox/credentials)
  SECRET_VARS=""
  SECRET_ENV_NAMES=(

    DOCKER_HUB_TOKEN DOCKER_HUB_USERNAME
    CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_ZONE_ID
    GRAFANA_ADMIN_PASSWORD
    GITHUB_RUNNER_TOKEN GITHUB_REPO_URL
  )
  log_debug "Building Ansible extra-vars from environment"
  for var_name in "${SECRET_ENV_NAMES[@]}"; do
    if [ -n "${!var_name}" ]; then
      SECRET_VARS="${SECRET_VARS} ${var_name}=${!var_name}"
      log_debug "  Including variable: $var_name"
    fi
  done

  ANSIBLE_CMD=(ansible-playbook -i inventory/all.yml playbooks/main.yml)
  if [ -f "$ANSIBLE_DIR/iac-toolbox.yml" ]; then
    ANSIBLE_CMD+=(--extra-vars "@iac-toolbox.yml")
    log_debug "Found config file: iac-toolbox.yml"
  fi
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
  log_debug "Starting Terraform execution"

  if [ -z "$GRAFANA_ADMIN_USER" ] || [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ -z "$ALERT_EMAIL" ]; then
    log_debug "Terraform validation failed: missing required variables"
    log_debug "GRAFANA_ADMIN_USER: $([ -n \"$GRAFANA_ADMIN_USER\" ] && echo 'present' || echo 'MISSING')"
    log_debug "GRAFANA_ADMIN_PASSWORD: $([ -n \"$GRAFANA_ADMIN_PASSWORD\" ] && echo 'present' || echo 'MISSING')"
    log_debug "ALERT_EMAIL: $([ -n \"$ALERT_EMAIL\" ] && echo 'present' || echo 'MISSING')"
    echo -e "${RED}Error: Missing required variables for Terraform${NC}" >&2
    echo "Please ensure these environment variables are set:" >&2
    echo "  - GRAFANA_ADMIN_USER" >&2
    echo "  - GRAFANA_ADMIN_PASSWORD" >&2
    echo "  - ALERT_EMAIL" >&2
    exit 1
  fi

  log_debug "Terraform required variables validated"
  log_debug "Working directory: $TERRAFORM_DIR"
  log_debug "Generating terraform.tfvars with configuration"
  log_debug "  grafana_url: https://grafana.iac-toolbox.com"
  log_debug "  grafana_admin_user: $GRAFANA_ADMIN_USER"
  log_debug "  alert_email: $ALERT_EMAIL"
  log_debug "  pagerduty_token: $([ -n \"$PAGERDUTY_TOKEN\" ] && echo 'provided' || echo 'not provided')"

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
    log_debug "Executing: terraform init"
    terraform init
    log_debug "Executing: terraform apply -auto-approve"
    terraform apply -auto-approve
  )

  echo -e "${GREEN}✓ Terraform completed${NC}"
else
  echo -e "${YELLOW}Skipping Terraform execution${NC}"
  log_debug "Skipping Terraform execution (--ansible-only or similar mode)"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Install completed successfully${NC}"
echo -e "${GREEN}========================================${NC}"
