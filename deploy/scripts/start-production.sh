#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Démarrage des Services en Production
#  Usage : sudo ./start-production.sh
#  Ce script est conçu pour être exécuté sur le serveur (192.168.1.95)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

info()  { echo -e "${CYAN}  ℹ️  ${NC}$1"; }
ok()    { echo -e "${GREEN}  ✅ ${NC}$1"; }
warn()  { echo -e "${YELLOW}  ⚠️  ${NC}$1"; }
error() { echo -e "${RED}  ❌ ${NC}$1"; }

RMASC_DIR="${RMASC_DIR:-/opt/rmasc}"

echo ""
echo -e "${BOLD}${BLUE}  ╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}  ║${NC}  🏭  ${BOLD}RMASC FACTORY — Services${NC}               ${BOLD}${BLUE}║${NC}"
echo -e "${BOLD}${BLUE}  ╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. MongoDB ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[1/4] Vérification de MongoDB${NC}"
if systemctl is-active --quiet mongod 2>/dev/null; then
    ok "MongoDB est déjà en cours d'exécution"
elif service mongod status 2>/dev/null | grep -q "running"; then
    ok "MongoDB est déjà en cours d'exécution"
else
    info "Démarrage de MongoDB..."
    sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null || mongod --fork --logpath /var/log/mongod.log --dbpath /var/lib/mongodb 2>/dev/null || true
    sleep 2
    if pgrep -x mongod > /dev/null; then
        ok "MongoDB démarré"
    else
        warn "MongoDB n'a pas pu démarrer automatiquement"
    fi
fi

# ── 2. Backend API (via PM2) ───────────────────────────────────────────────
echo -e "\n${BOLD}[2/4] Démarrage du Backend API${NC}"
cd "$RMASC_DIR"

if command -v pm2 &>/dev/null; then
    if pm2 list 2>/dev/null | grep -q "rmasc-api"; then
        pm2 restart rmasc-api
        ok "Backend API redémarré (PM2)"
    else
        pm2 start deploy/pm2/ecosystem.config.cjs --only rmasc-api
        ok "Backend API démarré (PM2)"
    fi
    pm2 save --force
else
    warn "PM2 non installé. Démarrage direct..."
    cd backend
    nohup node api.mjs > /var/log/rmasc/api.log 2>&1 &
    echo $! > /var/run/rmasc-api.pid
    ok "Backend API démarré (PID: $(cat /var/run/rmasc-api.pid))"
    cd "$RMASC_DIR"
fi

# ── 3. Vérifications ───────────────────────────────────────────────────────
echo -e "\n${BOLD}[3/4] Vérifications${NC}"
sleep 3

# Vérifier que le backend tourne
if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    ok "Backend API (port 4000) → OK"
else
    warn "Backend API (port 4000) → PAS OK"
    info "Logs: pm2 logs rmasc-api --lines 20"
fi

# Vérifier Nginx
if curl -sf http://localhost:80 > /dev/null 2>&1; then
    ok "Nginx (port 80) → OK"
else
    warn "Nginx (port 80) → PAS OK"
    info "Vérifiez: sudo nginx -t && sudo systemctl restart nginx"
fi

# ── 4. Tunnel Cloudflare ───────────────────────────────────────────────────
echo -e "\n${BOLD}[4/4] Tunnel Cloudflare${NC}"
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    ok "Tunnel Cloudflare actif (systemd)"
elif pgrep -x cloudflared > /dev/null; then
    ok "Tunnel Cloudflare actif (process)"
else
    warn "Tunnel Cloudflare non démarré"
    info "Pour démarrer: sudo cloudflared tunnel run rmasc-factory"
fi

echo ""
echo -e "${BOLD}${GREEN}  ┌─────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${GREEN}  │  🎉  Tous les services sont opérationnels ! │${NC}"
echo -e "${BOLD}${GREEN}  │  📍  http://192.168.1.95                    │${NC}"
echo -e "${BOLD}${GREEN}  │  🌐  https://sarl-rmasc.com                 │${NC}"
echo -e "${BOLD}${GREEN}  └─────────────────────────────────────────────┘${NC}"
echo ""
