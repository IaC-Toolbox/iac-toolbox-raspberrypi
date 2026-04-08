#!/bin/bash

# ============================================
# OpenClaw AI Assistant Uninstall Script
# ============================================
# Removes OpenClaw systemd service deployed by Ansible

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}OpenClaw AI Assistant Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Default values if not in .env
RPI_HOST="${RPI_HOST:-raspberry-4b.local}"
RPI_USER="${RPI_USER:-pi}"

echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
echo ""

# ============================================
# Step 1: Stop and disable service
# ============================================
echo -e "${YELLOW}[1/2] Stopping and disabling openclaw service...${NC}"
ssh $RPI_USER@$RPI_HOST "sudo systemctl stop openclaw 2>/dev/null || true"
ssh $RPI_USER@$RPI_HOST "sudo systemctl disable openclaw 2>/dev/null || true"
echo -e "${GREEN}✓ Service stopped and disabled${NC}"
echo ""

# ============================================
# Step 2: Remove systemd service file
# ============================================
echo -e "${YELLOW}[2/2] Removing systemd service file...${NC}"
ssh $RPI_USER@$RPI_HOST "sudo rm -f /etc/systemd/system/openclaw.service"
ssh $RPI_USER@$RPI_HOST "sudo systemctl daemon-reload"
echo -e "${GREEN}✓ Service file removed${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OpenClaw AI Assistant successfully uninstalled!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Removed:"
echo "  - openclaw systemd service"
echo "  - /etc/systemd/system/openclaw.service"
echo ""
echo "Note: The openclaw binary at /usr/bin/openclaw was NOT removed."
echo "      You can remove it manually if desired."
echo ""
