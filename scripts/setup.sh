#!/bin/bash

# ============================================
# Raspberry Pi Infrastructure Setup Script
# ============================================
# This script automates the initial setup:
# 1. Installs Ansible on macOS
# 2. Generates vault password
# 3. Creates encrypted secrets
# 4. Runs main playbook

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ANSIBLE_DIR="$PROJECT_ROOT/ansible-configurations"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/grafana-alerts"

# Parse command-line flags
RUN_ANSIBLE=true
RUN_TERRAFORM=true
ANSIBLE_TAGS=""

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
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --ansible-only     Run only Ansible playbook (infrastructure)"
      echo "  --terraform-only   Run only Terraform (Grafana alerts)"
      echo "  --assistant        Deploy only OpenClaw AI Assistant service"
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
echo -e "${GREEN}Raspberry Pi Infrastructure Setup${NC}"
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
echo ""

# ============================================
# Step 1: Check Homebrew
# ============================================
echo -e "${YELLOW}[1/6] Checking Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Error: Homebrew is not installed${NC}"
    echo "Install from: https://brew.sh"
    exit 1
fi
echo -e "${GREEN}✓ Homebrew found${NC}"
echo ""

# ============================================
# Step 2: Install Ansible
# ============================================
echo -e "${YELLOW}[2/6] Checking Ansible installation...${NC}"
if ! command -v ansible &> /dev/null; then
    echo "Installing Ansible..."
    brew install ansible
else
    echo -e "${GREEN}✓ Ansible already installed${NC}"
fi
ansible --version | head -n 1
echo ""

# ============================================
# Step 3: Install Terraform
# ============================================
if [ "$RUN_TERRAFORM" = true ]; then
    echo -e "${YELLOW}[3/6] Checking Terraform installation...${NC}"
    if ! command -v terraform &> /dev/null; then
        echo "Installing Terraform..."
        brew tap hashicorp/tap
        brew install hashicorp/tap/terraform
    else
        echo -e "${GREEN}✓ Terraform already installed${NC}"
    fi
    terraform version | head -n 1
    echo ""
else
    echo -e "${YELLOW}[3/6] Skipping Terraform installation (--ansible-only)${NC}"
    echo ""
fi

# ============================================
# Step 4: Check .env file
# ============================================
echo -e "${YELLOW}[4/6] Checking environment configuration...${NC}"
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create $PROJECT_ROOT/.env from .env.example:"
    echo "  cd $PROJECT_ROOT"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your configuration"
    exit 1
fi
echo -e "${GREEN}✓ .env file found${NC}"

# Load environment variables
set -a
source "$PROJECT_ROOT/.env"
set +a

# Validate required variables
REQUIRED_VARS=("RPI_HOST" "RPI_USER" "GITHUB_REPO_URL" "GITHUB_RUNNER_TOKEN")
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

# ============================================
# Step 5: Generate Vault Password
# ============================================
echo -e "${YELLOW}[5/6] Setting up Ansible Vault...${NC}"
VAULT_PASS_FILE="$ANSIBLE_DIR/.vault_pass.txt"

if [ ! -f "$VAULT_PASS_FILE" ]; then
    echo "Generating vault password..."
    openssl rand -base64 32 > "$VAULT_PASS_FILE"
    chmod 600 "$VAULT_PASS_FILE"
    echo -e "${GREEN}✓ Vault password generated${NC}"
else
    echo -e "${GREEN}✓ Vault password already exists${NC}"
fi

# Create encrypted secrets
if [ ! -f "$ANSIBLE_DIR/secrets.yml" ]; then
    echo "Creating encrypted secrets..."
    cd "$ANSIBLE_DIR"
    ansible-playbook playbooks/seed_vault.yml
    echo -e "${GREEN}✓ Secrets encrypted${NC}"
else
    echo -e "${GREEN}✓ Encrypted secrets already exist${NC}"
    echo "To regenerate: rm $ANSIBLE_DIR/secrets.yml and run this script again"
fi
echo ""

# ============================================
# Step 6: Run Main Playbook
# ============================================
if [ "$RUN_ANSIBLE" = true ]; then
    echo -e "${YELLOW}[6/6] Running Ansible playbook...${NC}"
    echo ""
    echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
    echo ""

    cd "$ANSIBLE_DIR"

    # Build ansible-playbook command
    ANSIBLE_CMD="ansible-playbook -i inventory/all.yml playbooks/main.yml --vault-password-file $VAULT_PASS_FILE"

    # Add tags if specified
    if [ -n "$ANSIBLE_TAGS" ]; then
        ANSIBLE_CMD="$ANSIBLE_CMD --tags $ANSIBLE_TAGS"
    fi

    # Run ansible-playbook
    eval "$ANSIBLE_CMD"

    cd "$PROJECT_ROOT"
    echo ""
else
    echo -e "${YELLOW}[6/6] Skipping Ansible playbook (--terraform-only)${NC}"
    echo ""
fi

# ============================================
# Step 7: Run Terraform for Grafana Alerts
# ============================================
if [ "$RUN_TERRAFORM" = true ]; then
    echo -e "${YELLOW}Configuring Grafana alerts with Terraform...${NC}"
    echo ""

    # Validate required variables for Terraform
    if [ -z "$GRAFANA_ADMIN_USER" ] || [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ -z "$ALERT_EMAIL" ]; then
        echo -e "${RED}Error: Missing required variables for Terraform${NC}"
        echo "Please ensure these are set in $ANSIBLE_DIR/.env:"
        echo "  - GRAFANA_ADMIN_USER"
        echo "  - GRAFANA_ADMIN_PASSWORD"
        echo "  - ALERT_EMAIL"
        exit 1
    fi

    cd "$TERRAFORM_DIR"

    # Generate terraform.tfvars from .env
    cat > terraform.tfvars <<EOF
grafana_url            = "https://grafana.iac-toolbox.com"
grafana_admin_user     = "${GRAFANA_ADMIN_USER}"
grafana_admin_password = "${GRAFANA_ADMIN_PASSWORD}"
alert_email            = "${ALERT_EMAIL}"

# PagerDuty configuration (optional)
pagerduty_token          = "${PAGERDUTY_TOKEN:-}"
pagerduty_service_region = "${PAGERDUTY_SERVICE_REGION:-us}"
pagerduty_user_email     = "${PAGERDUTY_USER_EMAIL:-}"
EOF

    echo -e "${GREEN}✓ Generated terraform.tfvars${NC}"

    # Initialize Terraform
    echo "Initializing Terraform..."
    terraform init

    # Apply Terraform configuration
    echo "Applying Grafana alert configuration..."
    terraform apply -auto-approve

    cd "$PROJECT_ROOT"
    echo ""
    echo -e "${GREEN}✓ Grafana alerts configured successfully${NC}"
    echo ""
else
    echo -e "${YELLOW}Skipping Terraform execution (--ansible-only)${NC}"
    echo ""
fi

# ============================================
# Success!
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
if [ "$RUN_TERRAFORM" = true ]; then
  echo "Grafana Alerts:"
  echo "  - Access: https://grafana.iac-toolbox.com/alerting/list"
  echo "  - 5 alerts configured: CPU (5%), Memory (90%), Disk (80%), Offline (5m), Temp (75°C)"

  if [ -n "$PAGERDUTY_TOKEN" ]; then
    echo "  - Notifications: PagerDuty (incidents created automatically)"
    echo "  - PagerDuty Service: Raspberry-Pi-Monitoring"
    echo "  - Install mobile app: iOS/Android for push notifications"
  else
    echo "  - Notifications: Email ($ALERT_EMAIL)"
    echo "  - SMTP configuration required in Grafana UI for email delivery"
    echo "  - To enable PagerDuty: Add PAGERDUTY_TOKEN to .env and re-run setup"
  fi

  echo "  - To update alerts: cd terraform/grafana-alerts && terraform apply"
  echo ""
fi
echo "Next steps:"
if [ "$RUN_ANSIBLE" = true ]; then
  echo "1. SSH into your Pi: ssh $RPI_USER@$RPI_HOST"
  echo "2. Verify Docker: docker --version"
  echo "3. Check secrets: cat /etc/raspberrypi.env"
  echo ""
  echo "If using Cloudflare Tunnel:"
  echo "  ssh $RPI_USER@$RPI_HOST 'cloudflared tunnel login'"
  echo "  Then re-run: ansible-playbook -i inventory/all.yml playbooks/main.yml --tags cloudflare"
else
  echo "1. Verify alerts in Grafana: https://grafana.iac-toolbox.com/alerting/list"
  echo "2. Test alert by lowering threshold in terraform/grafana-alerts/alerts.tf"
  if [ -n "$PAGERDUTY_TOKEN" ]; then
    echo "3. Check PagerDuty mobile app for push notifications"
    echo "4. View incidents: https://your-company.pagerduty.com/incidents"
  else
    echo "3. Configure SMTP in Grafana UI if email delivery needed"
  fi
fi
echo ""
