#!/bin/bash

# ============================================
# Metrics Agent Uninstall Script
# ============================================
# Removes Node Exporter and Grafana Alloy
# installed by the node_exporter and grafana-alloy Ansible roles.

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
      echo "  --local   Uninstall metrics agent from this machine instead of SSH"
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
echo -e "${YELLOW}Metrics Agent Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  echo -e "${YELLOW}Target: local machine${NC}"
else
  echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
fi
echo ""

# ============================================
# Step 1: Stop and disable Grafana Alloy
# ============================================
echo -e "${YELLOW}[1/4] Stopping and disabling Grafana Alloy...${NC}"
if [ "$(uname -s)" = "Darwin" ]; then
  run_target "sudo launchctl stop grafana-alloy 2>/dev/null || true"
  run_target "sudo launchctl unload /Library/LaunchDaemons/grafana-alloy.plist 2>/dev/null || true"
  run_target "sudo rm -f /Library/LaunchDaemons/grafana-alloy.plist"
else
  run_target "sudo systemctl stop alloy 2>/dev/null || true"
  run_target "sudo systemctl disable alloy 2>/dev/null || true"
  run_target "sudo rm -f /etc/systemd/system/alloy.service"
  run_target "sudo systemctl daemon-reload"
fi
echo -e "${GREEN}✓ Grafana Alloy stopped and disabled${NC}"
echo ""

# ============================================
# Step 2: Stop and disable Node Exporter
# ============================================
echo -e "${YELLOW}[2/4] Stopping and disabling Node Exporter...${NC}"
if [ "$(uname -s)" = "Darwin" ]; then
  run_target "sudo launchctl stop node_exporter 2>/dev/null || true"
  run_target "sudo launchctl unload /Library/LaunchDaemons/node_exporter.plist 2>/dev/null || true"
  run_target "sudo rm -f /Library/LaunchDaemons/node_exporter.plist"
else
  run_target "sudo systemctl stop node_exporter 2>/dev/null || true"
  run_target "sudo systemctl disable node_exporter 2>/dev/null || true"
  run_target "sudo rm -f /etc/systemd/system/node_exporter.service"
  run_target "sudo systemctl daemon-reload"
fi
echo -e "${GREEN}✓ Node Exporter stopped and disabled${NC}"
echo ""

# ============================================
# Step 3: Remove binaries
# ============================================
echo -e "${YELLOW}[3/4] Removing binaries...${NC}"
run_target "sudo rm -f /usr/local/bin/alloy 2>/dev/null || true"
run_target "sudo rm -f /usr/local/bin/node_exporter 2>/dev/null || true"
echo -e "${GREEN}✓ Binaries removed${NC}"
echo ""

# ============================================
# Step 4: Remove configuration files
# ============================================
echo -e "${YELLOW}[4/4] Removing configuration files...${NC}"
run_target "sudo rm -f /etc/alloy/config.alloy 2>/dev/null || true"
run_target "sudo rm -df /etc/alloy 2>/dev/null || true"
echo -e "${GREEN}✓ Configuration files removed${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Metrics agent successfully uninstalled${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Removed:"
echo "  - Grafana Alloy service and binary"
echo "  - Node Exporter service and binary"
echo "  - /etc/alloy/config.alloy"
echo ""
