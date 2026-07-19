#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Production Deployment Script
#  Usage : bash deploy-prod.sh
#  À exécuter sur le serveur après un git pull
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ─── Couleurs ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Étape 1 : Nettoyer l'ancien build ──────────────────────────────────
info "🧹 Nettoyage de l'ancien build..."
rm -rf ~/rmasc-erp/dist

# ─── Étape 2 : Installer les dépendances ─────────────────────────────────
info "📦 Installation des dépendances backend..."
cd ~/rmasc-erp/backend && npm install --silent 2>/dev/null
info "📦 Installation des dépendances frontend..."
cd ~/rmasc-erp && npm install --silent 2>/dev/null

# ─── Étape 3 : Build du frontend ─────────────────────────────────────────
info "🏗️  Build du frontend React..."
npx vite build
if [ ! -d "dist" ]; then err "❌ Build échoué — dossier dist introuvable"; exit 1; fi
info "✅ Build terminé"

# ─── Étape 4 : Copier vers le dossier web root ──────────────────────────
# 🔧 ADAPTE CE CHEMIN selon le résultat de l'étape 1
WEB_ROOT="${1:-$HOME/rmasc-dashboard}"
info "📂 Copie des fichiers vers ${WEB_ROOT}..."
mkdir -p "$WEB_ROOT"
cp -r dist/* "$WEB_ROOT/"
info "✅ Frontend copié vers ${WEB_ROOT}"

# ─── Étape 5 : Redémarrer les services ──────────────────────────────────
info "🔄 Redémarrage des services..."

# Backend Node.js
echo "  → Arrêt de l'ancien backend..."
pkill -f "node api.mjs" 2>/dev/null || true
sleep 1
echo "  → Démarrage du backend..."
cd ~/rmasc-erp/backend
nohup node api.mjs > ~/rmasc-backend.log 2>&1 &
sleep 2

# Vérifier le port (4000 ou 4001)
BACKEND_PORT=4001
curl -s http://localhost:4001/api/health > /dev/null 2>&1 || BACKEND_PORT=4000
if curl -s "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
  info "✅ Backend démarré (port ${BACKEND_PORT})"
else
  warn "⚠️  Backend non accessible"
fi

# Cloudflare Tunnel
if command -v cloudflared &>/dev/null; then
  echo "  → Redémarrage du tunnel..."
  systemctl restart cloudflared 2>/dev/null || {
    pkill cloudflared 2>/dev/null || true
    nohup cloudflared tunnel run > /dev/null 2>&1 &
  }
  info "✅ Cloudflare Tunnel redémarré"
fi

# ─── Étape 6 : Vérification ──────────────────────────────────────────────
info "🔍 Test de l'API..."
sleep 2
curl -s http://localhost:4001/api/health | head -1 || warn "⚠️  API non accessible sur le port 4001"

echo ""
echo -e "  ${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "  ${BOLD}${GREEN}║    ✅ RMASC FACTORY — DÉPLOIEMENT OK         ║${NC}"
echo -e "  ${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
info "🌍 https://sarl-rmasc.com"
