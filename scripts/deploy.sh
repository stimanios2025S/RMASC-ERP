#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Deploy Script
#  Usage: bash scripts/deploy.sh
#  Run from project root (cd /home/sarlrmasc/rmasc-erp)
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Stop on any error

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  🚀 RMASC FACTORY — Déploiement             ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Pull latest code ──────────────────────────────────────────────────
echo "  📥 Pull depuis GitHub..."
git pull origin main

# ── 2. Install frontend dependencies ─────────────────────────────────────
echo "  📦 Installation dépendances frontend..."
npm ci

# ── 3. Install backend dependencies ──────────────────────────────────────
echo "  📦 Installation dépendances backend..."
cd backend && npm ci && cd ..

# ── 4. Build frontend ────────────────────────────────────────────────────
echo "  🔨 Build frontend..."
npm run build

# ── 5. Gracefully stop old backend ───────────────────────────────────────
echo "  🛑 Arrêt de l'ancien backend..."
# Kill by PID file if exists, otherwise by port
OLD_PID=$(pgrep -f "node.*backend/api.mjs" 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
  kill "$OLD_PID" 2>/dev/null || true
  # Wait for it to die
  for i in 1 2 3 4 5; do
    if ! kill -0 "$OLD_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  # Force kill if still alive
  kill -9 "$OLD_PID" 2>/dev/null || true
fi
sleep 1

# ── 6. Start new backend ─────────────────────────────────────────────────
echo "  ▶️  Démarrage du nouveau backend..."
PORT=4001 nohup node /home/sarlrmasc/rmasc-erp/backend/api.mjs > /tmp/rmasc.log 2>&1 &
NEW_PID=$!
echo "  ✅ PID: $NEW_PID"

# ── 7. Wait and verify ───────────────────────────────────────────────────
sleep 3
echo ""
echo "  ── Vérification ──"
curl -s http://localhost:4001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4001/api/health
echo ""

# ── 8. Deploy version info ───────────────────────────────────────────────
echo "  ── Version déployée ──"
curl -s http://localhost:4001/api/version | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4001/api/version
echo ""
echo "  ✅ Déploiement terminé avec succès !"
echo "  ℹ️  Logs: tail -f /tmp/rmasc.log"
echo ""
