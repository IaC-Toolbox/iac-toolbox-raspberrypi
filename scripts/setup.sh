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

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Raspberry Pi Infrastructure Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# Step 1: Check Homebrew
# ============================================
echo -e "${YELLOW}[1/5] Checking Homebrew...${NC}"
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
echo -e "${YELLOW}[2/5] Checking Ansible installation...${NC}"
if ! command -v ansible &> /dev/null; then
    echo "Installing Ansible..."
    brew install ansible
else
    echo -e "${GREEN}✓ Ansible already installed${NC}"
fi
ansible --version | head -n 1
echo ""

# ============================================
# Step 3: Check .env file
# ============================================
echo -e "${YELLOW}[3/5] Checking environment configuration...${NC}"
if [ ! -f "$ANSIBLE_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create $ANSIBLE_DIR/.env from .env.example:"
    echo "  cd $ANSIBLE_DIR"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your configuration"
    exit 1
fi
echo -e "${GREEN}✓ .env file found${NC}"

# Load environment variables
set -a
source "$ANSIBLE_DIR/.env"
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
# Step 4: Generate Vault Password
# ============================================
echo -e "${YELLOW}[4/5] Setting up Ansible Vault...${NC}"
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
# Step 5: Run Main Playbook
# ============================================
echo -e "${YELLOW}[5/5] Running Ansible playbook...${NC}"
echo ""
echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
echo ""

cd "$ANSIBLE_DIR"
ansible-playbook \
    -i inventory/all.yml \
    playbooks/main.yml \
    --vault-password-file "$VAULT_PASS_FILE"

# ============================================
# Success!
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. SSH into your Pi: ssh $RPI_USER@$RPI_HOST"
echo "2. Verify Docker: docker --version"
echo "3. Check secrets: cat /etc/raspberrypi.env"
echo ""
echo "If using Cloudflare Tunnel:"
echo "  ssh $RPI_USER@$RPI_HOST 'cloudflared tunnel login'"
echo "  Then re-run: ansible-playbook -i inventory/all.yml playbooks/main.yml --tags cloudflare"
echo ""
