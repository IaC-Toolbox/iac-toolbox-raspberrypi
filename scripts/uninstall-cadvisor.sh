#!/bin/bash

# ============================================
# cAdvisor Uninstall Script
# ============================================
# Stops and removes the cAdvisor container and its compose file.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RPI_LOCAL_MODE="${RPI_LOCAL:-false}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      RPI_LOCAL_MODE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--local]"
      echo ""
      echo "Options:"
      echo "  --local   Uninstall cAdvisor from this machine instead of SSH"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

RPI_HOST="${RPI_HOST:-raspberry-4b.local}"
RPI_USER="${RPI_USER:-pi}"

run_target() {
  if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
    bash -lc "$1"
  else
    ssh "$RPI_USER@$RPI_HOST" "$1"
  fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}cAdvisor Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  echo -e "${YELLOW}Target: local machine${NC}"
else
  echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
fi
echo ""

CADVISOR_DIR="${HOME}/.iac-toolbox/cadvisor"

# ============================================
# Step 1: Stop and remove cAdvisor container
# ============================================
echo -e "${YELLOW}[1/2] Stopping and removing cAdvisor container...${NC}"
run_target "if [ -f '${CADVISOR_DIR}/docker-compose.yml' ]; then cd '${CADVISOR_DIR}' && docker compose down 2>/dev/null || true; fi"
run_target "docker rm -f cadvisor 2>/dev/null || true"
echo -e "${GREEN}✓ cAdvisor container stopped and removed${NC}"
echo ""

# ============================================
# Step 2: Remove compose file and directory
# ============================================
echo -e "${YELLOW}[2/2] Removing cAdvisor configuration files...${NC}"
run_target "rm -rf '${CADVISOR_DIR}' 2>/dev/null || true"
echo -e "${GREEN}✓ cAdvisor configuration files removed${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}cAdvisor successfully uninstalled${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Removed:"
echo "  - cAdvisor container"
echo "  - ${CADVISOR_DIR}"
echo ""
