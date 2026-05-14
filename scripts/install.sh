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
ANSIBLE_PLAYBOOK="site.yml"
RPI_LOCAL_MODE="${RPI_LOCAL:-false}"
FILE_PATH_ARG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --filePath=*)
      FILE_PATH_ARG="${1#*=}"
      shift
      ;;
    --filePath)
      FILE_PATH_ARG="$2"
      shift 2
      ;;
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
      ANSIBLE_PLAYBOOK="vault.yml"
      shift
      ;;
    --observability-platform)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="observability_platform.yml"
      shift
      ;;
    --observability-agent)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="observability_agent.yml"
      shift
      ;;
    --cadvisor)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="cadvisor.yml"
      shift
      ;;
    --cloudflared)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="cloudflare.yml"
      shift
      ;;
    --grafana)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="grafana.yml"
      shift
      ;;
    --prometheus)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="prometheus.yml"
      shift
      ;;
    --metrics-agent)
      RUN_TERRAFORM=false
      ANSIBLE_PLAYBOOK="metrics-agent.yml"
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
      echo "  --vault                   Deploy only HashiCorp Vault"
      echo "  --observability-platform  Deploy full observability stack in one Ansible run"
      echo "  --observability-agent     Deploy agent stack only (Node Exporter + Grafana Alloy + cAdvisor)"
      echo "  --cadvisor                Deploy only cAdvisor"
      echo "  --cloudflared             Deploy only Cloudflare tunnel"
      echo "  --grafana                 Deploy only Grafana observability stack"
      echo "  --prometheus              Deploy only Prometheus metrics collection"
      echo "  --metrics-agent           Deploy only Node Exporter + Grafana Alloy"
      echo "  --local            Run Ansible locally on this machine instead of SSH"
      echo "  --filePath <path>  Path to a per-device config file (overrides iac-toolbox.yml lookup)"
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
elif [ "$ANSIBLE_PLAYBOOK" != "site.yml" ]; then
  echo -e "${YELLOW}Mode: Ansible playbook: $ANSIBLE_PLAYBOOK${NC}"
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
echo -e "${GREEN}✓ Required variables present${NC}"
echo ""

if [ "$RUN_ANSIBLE" = true ]; then
  echo -e "${YELLOW}[4/4] Running Ansible playbook...${NC}"
  echo -e "${YELLOW}Target: defined in config file (target.mode/host/user)${NC}"

  ANSIBLE_CMD=(ansible-playbook -i inventory/all.yml "playbooks/$ANSIBLE_PLAYBOOK")

  # Load iac-toolbox.yml configuration file
  # Priority: 1) --filePath flag, 2) IAC_TOOLBOX_CONFIG env var, 3) infrastructure/ folder, 4) ~/.iac-toolbox/
  IAC_CONFIG_FILE=""
  if [ -n "$FILE_PATH_ARG" ]; then
    if [ -f "$FILE_PATH_ARG" ]; then
      IAC_CONFIG_FILE="$(realpath "$FILE_PATH_ARG")"
      echo -e "${GREEN}✓ Using configuration from --filePath: $IAC_CONFIG_FILE${NC}"
    else
      echo -e "${RED}Error: --filePath file not found: $FILE_PATH_ARG${NC}"
      exit 1
    fi
  elif [ -n "$IAC_TOOLBOX_CONFIG" ] && [ -f "$IAC_TOOLBOX_CONFIG" ]; then
    IAC_CONFIG_FILE="$(realpath "$IAC_TOOLBOX_CONFIG")"
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
    echo -e "${YELLOW}⚠ No iac-toolbox.yml configuration file found. Use --filePath to specify one, or run init first. Using role defaults.${NC}"
  fi
  ANSIBLE_CMD+=(--extra-vars "project_root=${PROJECT_ROOT}")

  if ! (
    cd "$ANSIBLE_DIR"
    "${ANSIBLE_CMD[@]}"
  ); then
    ANSIBLE_EXIT_CODE=$?
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}ERROR: Ansible playbook failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}The Ansible playbook execution failed with exit code $ANSIBLE_EXIT_CODE${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "  1. Review the Ansible output above for specific error details"
    echo "  2. Verify all required environment variables are correctly set"
    echo "  3. Check SSH connectivity if running in remote mode (RPI_LOCAL=false)"
    echo "  4. Ensure the target host meets all prerequisites"
    echo "  5. Review the Ansible inventory file at: $ANSIBLE_DIR/inventory/all.yml"
    echo ""
    exit $ANSIBLE_EXIT_CODE
  fi
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

  if ! (
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
  ); then
    TERRAFORM_EXIT_CODE=$?
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}ERROR: Terraform failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Terraform execution failed with exit code $TERRAFORM_EXIT_CODE${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "  1. Review the Terraform output above for specific error details"
    echo "  2. Verify Grafana is accessible at the configured URL"
    echo "  3. Check that GRAFANA_ADMIN_USER and GRAFANA_ADMIN_PASSWORD are correct"
    echo "  4. Ensure ALERT_EMAIL is a valid email address"
    echo "  5. Review Terraform configuration at: $TERRAFORM_DIR"
    echo ""
    exit $TERRAFORM_EXIT_CODE
  fi

  echo -e "${GREEN}✓ Terraform completed${NC}"
else
  echo -e "${YELLOW}Skipping Terraform execution${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Install completed successfully${NC}"
echo -e "${GREEN}========================================${NC}"
