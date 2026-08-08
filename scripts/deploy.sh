#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Deploy Script
#  Usage: bash scripts/deploy.sh
#  Run from project root (cd /home/sarlrmasc/rmasc-erp)
# ═══════════════════════════════════════════════════════════════════════════

set -o pipefail

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
(cd backend && npm ci) || echo "  ⚠️  Erreur backend npm ci"

# ── 4. Build frontend ────────────────────────────────────────────────────
echo "  🔨 Build frontend..."
npm run build

# ── 5. Kill old backend by PORT (most reliable method) ───────────────────
echo "  🛑 Arrêt de l'ancien backend..."
# Try fuser first, then lsof, then pkill as fallback
if command -v fuser &>/dev/null; then
  fuser -k 4001/tcp 2>/dev/null || true
elif command -v lsof &>/dev/null; then
  lsof -ti:4001 | xargs kill -9 2>/dev/null || true
else
  pkill -f "node.*backend/api\.mjs" 2>/dev/null || true
fi
sleep 2

# ── 6. Relancer le backend via PM2 (SEUL patron — tue l'ancien proprement) ──
# PM2 est le gestionnaire unique (comme OnSite) : plus de doublons nohup/systemd.
echo "  ▶️  Démarrage du nouveau backend (PM2)..."
if pm2 describe rmasc-erp > /dev/null 2>&1; then
  pm2 restart rmasc-erp --update-env
else
  cd /home/sarlrmasc/rmasc-erp/backend
  PORT=4001 pm2 start api.mjs --name rmasc-erp --update-env
fi
pm2 save > /dev/null 2>&1 || true

# ── 7. Wait and verify ───────────────────────────────────────────────────
echo "  ⏳ Attente du démarrage..."
sleep 4
echo ""
echo "  ── Vérification ──"
HEALTH=$(curl -s http://localhost:4001/api/health 2>/dev/null || echo '{"error":"curl failed"}')
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

# If uptime is >30s, the new process didn't start — force restart via PM2
UPTIME=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptimeSeconds',''))" 2>/dev/null)
if [ -n "$UPTIME" ] && [ "$UPTIME" -gt 30 ] 2>/dev/null; then
  echo ""
  echo "  ⚠️  Ancien serveur encore actif (uptime=${UPTIME}s). Redémarrage forcé via PM2..."
  pm2 restart rmasc-erp --update-env
  sleep 4
  echo ""
  echo "  ── Vérification après force ──"
  curl -s http://localhost:4001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4001/api/health
fi

# ── 8. Version info ──────────────────────────────────────────────────────
echo ""
echo "  ── Version déployée ──"
VERSION=$(curl -s http://localhost:4001/api/version 2>/dev/null)
echo "$VERSION" | python3 -m json.tool 2>/dev/null || echo "$VERSION"
echo ""

echo "  ✅ Déploiement terminé !"
echo "  ℹ️  Logs: tail -f /tmp/rmasc.log"
echo ""
