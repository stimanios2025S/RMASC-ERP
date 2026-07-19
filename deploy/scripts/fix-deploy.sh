#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Emergency Fix Deployment
#  Run this script DIRECTLY on the server (192.168.1.95)
#  Usage:  bash fix-deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC}  $1"; }
err()  { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC}  $1"; }
step() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

PROJECT_DIR="$HOME/rmasc-erp"
DASHBOARD_DIR="$HOME/rmasc-dashboard"
REPO_URL="https://github.com/stimanios2025S/RMASC-ERP.git"
BRANCH="deploy"
BACKUP_ENV="$HOME/rmasc-erp.env.backup"

echo ""
echo -e "${BOLD}${BLUE}  ╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}  ║  🏭  RMASC FACTORY — Emergency Fix Deploy   ║${NC}"
echo -e "${BOLD}${BLUE}  ╚══════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 0: ESCAPE the deleted directory
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 0 — Escape deleted CWD"
cd "$HOME" 2>/dev/null || cd /tmp
ok "Working directory: $(pwd)"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Kill ALL RMASC processes
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 1 — Kill all running RMASC processes"

# Kill PM2 processes first (if PM2 is installed)
if command -v pm2 &>/dev/null; then
    info "Stopping PM2 processes..."
    pm2 stop rmasc-api 2>/dev/null || true
    pm2 stop rmasc-backend 2>/dev/null || true
    pm2 delete rmasc-api 2>/dev/null || true
    pm2 delete rmasc-backend 2>/dev/null || true
    ok "PM2 processes stopped"
fi

# Kill any remaining node processes related to RMASC
NODE_PIDS=$(pgrep -f "node.*api.mjs" 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    info "Killing node api.mjs processes: $NODE_PIDS"
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    ok "Node processes killed"
else
    info "No node api.mjs processes found"
fi

# Kill any vite dev servers
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)
if [ -n "$VITE_PIDS" ]; then
    info "Killing vite processes: $VITE_PIDS"
    echo "$VITE_PIDS" | xargs kill -9 2>/dev/null || true
    ok "Vite processes killed"
fi

# Free up port 4000 if something else is on it
PORT_PID=$(lsof -ti:4000 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    info "Port 4000 occupied by PID $PORT_PID — killing..."
    kill -9 "$PORT_PID" 2>/dev/null || true
    ok "Port 4000 freed"
fi

sleep 2
ok "All RMASC processes killed"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Backup .env (if it still exists)
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 2 — Backup .env"

if [ -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env" "$BACKUP_ENV"
    ok "Backed up: $PROJECT_DIR/backend/.env → $BACKUP_ENV"
elif [ -f "$BACKUP_ENV" ]; then
    ok "Using existing backup: $BACKUP_ENV"
else
    warn "NO .env backup found! You'll need to recreate it manually."
    warn "MONGODB_URI and JWT_SECRET are required!"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Clean and clone
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 3 — Clean and clone from GitHub"

# IMPORTANT: cd HOME first so we're not in the directory we're about to delete
cd "$HOME"

if [ -d "$PROJECT_DIR" ]; then
    info "Removing old project directory..."
    rm -rf "$PROJECT_DIR"
    ok "Old project removed"
fi

info "Cloning from $REPO_URL (branch: $BRANCH)..."
git clone -b "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
ok "Repository cloned"

cd "$PROJECT_DIR"
info "Current commit:"
git log --oneline -1

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Restore .env
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 4 — Restore .env"

if [ -f "$BACKUP_ENV" ]; then
    cp "$BACKUP_ENV" "$PROJECT_DIR/backend/.env"
    ok ".env restored to $PROJECT_DIR/backend/.env"
    # Show first 2 lines (masked) to confirm
    head -2 "$PROJECT_DIR/backend/.env" | sed 's/=.*/=***MASKED***/'
else
    err "NO .env backup! Create $PROJECT_DIR/backend/.env manually with:"
    echo "  MONGODB_URI=mongodb://localhost:27017/rmasc-erp"
    echo "  DATABASE_URL=mongodb://localhost:27017/rmasc-erp"
    echo "  JWT_SECRET=<your-secret>"
    echo "  PORT=4000"
    echo "  NODE_ENV=production"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Install dependencies
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 5 — Install dependencies"

info "Installing frontend dependencies..."
cd "$PROJECT_DIR"
npm install --no-audit --no-fund 2>&1 | tail -3
ok "Frontend dependencies installed"

info "Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --no-audit --no-fund 2>&1 | tail -3
ok "Backend dependencies installed"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Build frontend
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 6 — Build frontend"

cd "$PROJECT_DIR"

# Clean old dist first
rm -rf "$PROJECT_DIR/dist"

info "Running vite build..."
npx vite build

if [ -f "$PROJECT_DIR/dist/index.html" ]; then
    ok "Build successful — dist/index.html exists"
    ls -lh "$PROJECT_DIR/dist/index.html"
    echo ""
    info "Build output:"
    ls -lh "$PROJECT_DIR/dist/assets/"
else
    err "BUILD FAILED — dist/index.html not found!"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Deploy dist to the right locations
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 7 — Deploy frontend files"

# Deploy to ~/rmasc-dashboard (where it's been deployed historically)
info "Deploying to $DASHBOARD_DIR..."
mkdir -p "$DASHBOARD_DIR"
rm -rf "$DASHBOARD_DIR"/*
cp -r "$PROJECT_DIR/dist/"* "$DASHBOARD_DIR/"
ok "Frontend deployed to $DASHBOARD_DIR"

# Also deploy to /opt/rmasc/dist if that's where Nginx serves from
NGINX_DIST="/opt/rmasc/dist"
if [ -d "/opt/rmasc" ] || [ -L "/opt/rmasc" ]; then
    info "Deploying to $NGINX_DIST (Nginx root)..."
    sudo mkdir -p "$NGINX_DIST" 2>/dev/null || mkdir -p "$NGINX_DIST" 2>/dev/null || true
    sudo rm -rf "$NGINX_DIST"/* 2>/dev/null || rm -rf "$NGINX_DIST"/* 2>/dev/null || true
    sudo cp -r "$PROJECT_DIR/dist/"* "$NGINX_DIST/" 2>/dev/null || cp -r "$PROJECT_DIR/dist/"* "$NGINX_DIST/" 2>/dev/null || true
    ok "Frontend deployed to $NGINX_DIST"
else
    info "/opt/rmasc not found — Nginx may be serving from $DASHBOARD_DIR instead"
    info "If Nginx config points elsewhere, update it with:"
    echo "  sudo nano /etc/nginx/sites-available/rmasc-app.conf"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8: Restart backend
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 8 — Start backend"

cd "$PROJECT_DIR/backend"

# Try PM2 first
if command -v pm2 &>/dev/null; then
    info "Starting with PM2..."

    # Check if pm2 ecosystem file exists
    if [ -f "$PROJECT_DIR/deploy/pm2/ecosystem.config.cjs" ]; then
        cd "$PROJECT_DIR"
        pm2 start deploy/pm2/ecosystem.config.cjs --only rmasc-api 2>/dev/null || \
        pm2 start deploy/pm2/ecosystem.config.cjs 2>/dev/null || true
    else
        pm2 start api.mjs --name rmasc-api --cwd "$PROJECT_DIR/backend" 2>/dev/null || true
    fi

    pm2 save --force 2>/dev/null || true
    ok "Backend started via PM2"
else
    # Fallback: direct nohup
    info "PM2 not found — starting with nohup..."
    cd "$PROJECT_DIR/backend"
    nohup node api.mjs > "$HOME/rmasc-backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > /tmp/rmasc-backend.pid
    ok "Backend started with PID $BACKEND_PID (log: ~/rmasc-backend.log)"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 9: Reload Nginx
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 9 — Reload Nginx"

if command -v nginx &>/dev/null; then
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || true
        ok "Nginx reloaded"
    else
        warn "Nginx config test failed — check: sudo nginx -t"
    fi
else
    info "Nginx not found — Cloudflare tunnel may point directly to port 4000"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 10: Verify everything
# ═══════════════════════════════════════════════════════════════════════════
step "STEP 10 — Verify deployment"

sleep 3

echo ""
echo -e "${BOLD}Health Checks:${NC}"
echo "──────────────────────────────────────────────"

# Check backend API
if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Backend API (port 4000)"
    curl -s http://localhost:4000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4000/api/health
else
    echo -e "  ${RED}❌${NC} Backend API (port 4000) — NOT RESPONDING"
    echo "       Check logs: tail -50 ~/rmasc-backend.log"
    echo "       Or: pm2 logs rmasc-api --lines 20"
fi

# Check Nginx
echo ""
if curl -sf http://localhost:80 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Nginx (port 80)"
else
    echo -e "  ${YELLOW}⚠️${NC}  Nginx (port 80) — not responding (may be OK if tunnel goes to :4000)"
fi

# Check frontend via Nginx
echo ""
FRONTEND_HTML=$(curl -s http://localhost:80 2>/dev/null | head -3 || true)
if echo "$FRONTEND_HTML" | grep -q "RMASC\|rmasc\|root"; then
    echo -e "  ${GREEN}✅${NC} Frontend served via Nginx"
else
    echo -e "  ${YELLOW}⚠️${NC}  Frontend via Nginx — verify manually at https://sarl-rmasc.com"
fi

# Check Cloudflare tunnel
echo ""
if pgrep -x cloudflared > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Cloudflare tunnel running"
elif systemctl is-active --quiet cloudflared 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Cloudflare tunnel (systemd)"
else
    echo -e "  ${YELLOW}⚠️${NC}  Cloudflare tunnel — check: sudo systemctl start cloudflared"
fi

# Check MongoDB
echo ""
if pgrep -x mongod > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} MongoDB running"
else
    echo -e "  ${RED}❌${NC} MongoDB NOT running — start: sudo systemctl start mongod"
fi

# ═══════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}  ╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}  ║  🎉  Deployment Complete!                   ║${NC}"
echo -e "${BOLD}${GREEN}  ║  📍  http://192.168.1.95                    ║${NC}"
echo -e "${BOLD}${GREEN}  ║  🌐  https://sarl-rmasc.com                 ║${NC}"
echo -e "${BOLD}${GREEN}  ╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Troubleshooting:${NC}"
echo -e "    Backend logs:  ${CYAN}tail -f ~/rmasc-backend.log${NC}"
echo -e "    PM2 status:    ${CYAN}pm2 status${NC}"
echo -e "    PM2 logs:      ${CYAN}pm2 logs rmasc-api${NC}"
echo -e "    Nginx logs:    ${CYAN}sudo tail -f /var/log/nginx/rmasc-error.log${NC}"
echo -e "    Tunnel logs:   ${CYAN}sudo journalctl -u cloudflared -n 50${NC}"
echo -e ""
echo -e "  ${BOLD}⚠️  If old version still shows:${NC}"
echo -e "    1. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)"
echo -e "    2. Check: curl -s http://localhost:80 | head -5"
echo -e "    3. Check Nginx root: grep root /etc/nginx/sites-available/rmasc-app.conf"
echo ""
