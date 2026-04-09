#!/bin/bash

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
      echo "  --local   Uninstall cloudflared from this machine instead of SSH"
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

run_target() {
  if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
    bash -lc "$1"
  else
    ssh "$RPI_USER@$RPI_HOST" "$1"
  fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Cloudflared Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
if [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$RPI_LOCAL_MODE" = "1" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "yes" ] || [ "$(echo "$RPI_LOCAL_MODE" | tr '[:upper:]' '[:lower:]')" = "on" ]; then
  echo -e "${YELLOW}Target: local machine${NC}"
else
  echo -e "${YELLOW}Target: $RPI_USER@$RPI_HOST${NC}"
fi
echo ""

echo -e "${YELLOW}[1/4] Stopping and disabling cloudflared service...${NC}"
run_target "sudo systemctl stop cloudflared 2>/dev/null || true"
run_target "sudo systemctl disable cloudflared 2>/dev/null || true"
echo -e "${GREEN}✓ Service stopped and disabled${NC}"
echo ""

echo -e "${YELLOW}[2/4] Removing service and environment files...${NC}"
run_target "sudo rm -f /etc/systemd/system/cloudflared.service /etc/default/cloudflared"
run_target "sudo systemctl daemon-reload"
echo -e "${GREEN}✓ Service files removed${NC}"
echo ""

echo -e "${YELLOW}[3/4] Removing local cloudflared state...${NC}"
run_target "rm -rf /home/$RPI_USER/.cloudflared"
echo -e "${GREEN}✓ Local cloudflared state removed${NC}"
echo ""

echo -e "${YELLOW}[4/4] Removing Cloudflare-side tunnel and DNS records...${NC}"
python3 - <<'PY'
import json, os, urllib.request, urllib.parse

token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
zone = os.environ.get('CLOUDFLARE_ZONE_ID', '')
tunnel_name = os.environ.get('CLOUDFLARE_TUNNEL_NAME', 'main-backend-tunnel')
hostnames = [
    'api.iac-toolbox.com',
    'vault.iac-toolbox.com',
    'grafana.iac-toolbox.com',
    'alloy.iac-toolbox.com',
]

if not token or not account or not zone:
    print('Cloudflare API env vars not fully set; skipping remote tunnel/DNS cleanup')
    raise SystemExit(0)

def req(url, method='GET', body=None):
    r = urllib.request.Request(url, method=method)
    r.add_header('Authorization', f'Bearer {token}')
    r.add_header('Content-Type', 'application/json')
    data = None if body is None else json.dumps(body).encode()
    with urllib.request.urlopen(r, data=data, timeout=30) as resp:
        return json.loads(resp.read().decode())

try:
    tunnels = req(f'https://api.cloudflare.com/client/v4/accounts/{account}/cfd_tunnel')
    matches = [t for t in tunnels.get('result', []) if t.get('name') == tunnel_name]
    for t in matches:
        req(f'https://api.cloudflare.com/client/v4/accounts/{account}/cfd_tunnel/{t["id"]}', method='DELETE')
        print(f'Deleted tunnel {tunnel_name} ({t["id"]})')
except Exception as e:
    print(f'Warning: tunnel cleanup failed: {e}')

for host in hostnames:
    try:
        records = req(f'https://api.cloudflare.com/client/v4/zones/{zone}/dns_records?type=CNAME&name={urllib.parse.quote(host)}')
        for rec in records.get('result', []):
            req(f'https://api.cloudflare.com/client/v4/zones/{zone}/dns_records/{rec["id"]}', method='DELETE')
            print(f'Deleted DNS record {host}')
    except Exception as e:
        print(f'Warning: DNS cleanup failed for {host}: {e}')
PY

echo -e "${GREEN}✓ Local and Cloudflare-side uninstall complete${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cloudflared successfully uninstalled${NC}"
echo -e "${GREEN}========================================${NC}"
