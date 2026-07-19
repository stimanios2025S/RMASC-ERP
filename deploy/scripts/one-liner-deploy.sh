#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  ONE-LINER DEPLOY — Paste this entire block into the server SSH
#  The "cd ~" BEFORE "rm -rf" is the critical fix!
# ═══════════════════════════════════════════════════════════════════

cd ~ \
  && echo "=== Killing old processes ===" \
  && pkill -f "node.*api.mjs" 2>/dev/null; true \
  && pkill -f "vite" 2>/dev/null; true \
  && sleep 1 \
  && echo "=== Backing up .env ===" \
  && cp ~/rmasc-erp/backend/.env ~/rmasc.env.backup 2>/dev/null; true \
  && echo "=== Removing old project ===" \
  && rm -rf ~/rmasc-erp \
  && echo "=== Cloning fresh from GitHub ===" \
  && git clone -b deploy https://github.com/stimanios2025S/RMASC-ERP.git ~/rmasc-erp \
  && echo "=== Restoring .env ===" \
  && cp ~/rmasc.env.backup ~/rmasc-erp/backend/.env 2>/dev/null; true \
  && echo "=== Installing frontend dependencies ===" \
  && cd ~/rmasc-erp && npm install --no-audit --no-fund \
  && echo "=== Installing backend dependencies ===" \
  && cd ~/rmasc-erp/backend && npm install --no-audit --no-fund \
  && echo "=== Building frontend ===" \
  && cd ~/rmasc-erp && npx vite build \
  && echo "=== Deploying dist ===" \
  && mkdir -p ~/rmasc-dashboard \
  && rm -rf ~/rmasc-dashboard/* \
  && cp -r ~/rmasc-erp/dist/* ~/rmasc-dashboard/ \
  && echo "=== Starting backend ===" \
  && cd ~/rmasc-erp/backend \
  && nohup node api.mjs > ~/rmasc-backend.log 2>&1 & \
  && sleep 3 \
  && echo "=== Verifying ===" \
  && curl -s http://localhost:4000/api/health \
  && echo "" \
  && echo "✅ DEPLOYMENT COMPLETE — Check https://sarl-rmasc.com"
