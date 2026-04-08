#!/bin/bash

# ============================================
# HashiCorp Vault Uninstall Script
# ============================================
# Removes Vault containers, systemd services, and local data.

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
      echo "  --local   Uninstall Vault from this machine instead of SSH"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

RPI_HOST="${RPI_HOST:-raspberry-4b.local}"
RPI_USER="${RPI_USER:-pi}"
VAULT_BASE_DIR="/home/${RPI_USER}/vault"

run_target() {
  if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
    bash -lc "$1"
  else
    ssh "$RPI_USER@$RPI_HOST" "$1"
  fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}HashiCorp Vault Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  echo -e "${YELLOW}Target: local machine${NC}"
else
  echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
fi
echo ""

echo -e "${YELLOW}[1/5] Stopping and disabling vault services...${NC}"
run_target "sudo systemctl stop vault-unseal 2>/dev/null || true"
run_target "sudo systemctl disable vault-unseal 2>/dev/null || true"
run_target "sudo systemctl stop vault 2>/dev/null || true"
run_target "sudo systemctl disable vault 2>/dev/null || true"
echo -e "${GREEN}✓ Services stopped and disabled${NC}"
echo ""

echo -e "${YELLOW}[2/5] Removing Vault containers...${NC}"
run_target "if [ -d '$VAULT_BASE_DIR' ]; then cd '$VAULT_BASE_DIR' && docker compose down -v 2>/dev/null || true; fi"
run_target "docker rm -f vault vault-unsealer 2>/dev/null || true"
echo -e "${GREEN}✓ Containers removed${NC}"
echo ""

echo -e "${YELLOW}[3/5] Removing systemd units...${NC}"
run_target "sudo rm -f /etc/systemd/system/vault.service /etc/systemd/system/vault-unseal.service"
run_target "sudo systemctl daemon-reload"
echo -e "${GREEN}✓ Systemd units removed${NC}"
echo ""

echo -e "${YELLOW}[4/5] Removing Vault directory...${NC}"
run_target "sudo rm -rf '$VAULT_BASE_DIR'"
echo -e "${GREEN}✓ Vault directory removed${NC}"
echo ""

echo -e "${YELLOW}[5/5] Cleaning up dangling Docker resources...${NC}"
run_target "docker volume prune -f >/dev/null 2>&1 || true"
run_target "docker image prune -f >/dev/null 2>&1 || true"
echo -e "${GREEN}✓ Docker cleanup complete${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HashiCorp Vault successfully uninstalled${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Removed:"
echo "  - vault and vault-unsealer containers"
echo "  - /etc/systemd/system/vault.service"
echo "  - /etc/systemd/system/vault-unseal.service"
echo "  - $VAULT_BASE_DIR"
echo ""
echo "Note: This deletes Vault data, including initialization state and stored secrets."
