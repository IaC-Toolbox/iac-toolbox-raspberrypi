#!/bin/bash

# ============================================
# Loki Stack Uninstall Script
# ============================================
# Removes Loki + Alloy deployed by Ansible

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Loki Stack Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RPI_HOST="${RPI_HOST:-raspberry-4b.local}"
RPI_USER="${RPI_USER:-pi}"

echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
echo ""

# ============================================
# Step 1: Stop and remove containers
# ============================================
echo -e "${YELLOW}[1/5] Stopping and removing containers...${NC}"
ssh $RPI_USER@$RPI_HOST "cd /home/$RPI_USER/loki && docker compose down -v 2>/dev/null || true"
echo -e "${GREEN}✓ Containers removed${NC}"
echo ""

# ============================================
# Step 2: Remove systemd service
# ============================================
echo -e "${YELLOW}[2/5] Removing systemd service...${NC}"
ssh $RPI_USER@$RPI_HOST "sudo systemctl stop loki 2>/dev/null || true"
ssh $RPI_USER@$RPI_HOST "sudo systemctl disable loki 2>/dev/null || true"
ssh $RPI_USER@$RPI_HOST "sudo rm -f /etc/systemd/system/loki.service"
ssh $RPI_USER@$RPI_HOST "sudo systemctl daemon-reload"
echo -e "${GREEN}✓ Systemd service removed${NC}"
echo ""

# ============================================
# Step 3: Remove directories
# ============================================
echo -e "${YELLOW}[3/5] Removing directories...${NC}"
ssh $RPI_USER@$RPI_HOST "rm -rf /home/$RPI_USER/loki"
echo -e "${GREEN}✓ Directories removed${NC}"
echo ""

# ============================================
# Step 4: Remove Docker volumes
# ============================================
echo -e "${YELLOW}[4/5] Removing Docker volumes...${NC}"
ssh $RPI_USER@$RPI_HOST "docker volume rm loki_data 2>/dev/null || true"
echo -e "${GREEN}✓ Volumes removed${NC}"
echo ""

# ============================================
# Step 5: Cleanup orphaned images (optional)
# ============================================
echo -e "${YELLOW}[5/5] Cleaning up unused images...${NC}"
ssh $RPI_USER@$RPI_HOST "docker image prune -f" > /dev/null
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Loki stack successfully uninstalled!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Removed:"
echo "  - Loki and Alloy containers"
echo "  - loki systemd service"
echo "  - /home/$RPI_USER/loki directory"
echo "  - loki_data Docker volume"
echo ""
