#!/bin/bash
# ─── RMASC FACTORY — Script de vérification pré-déploiement ───────────────
# Usage : bash scripts/verify-deploy.sh

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🔍 RMASC — Vérification pré-déploiement     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

ERRORS=0

check() {
  local desc=$1
  shift
  echo -n "  [..] $desc... "
  if "$@" > /dev/null 2>&1; then
    echo -e "\r  [✅] $desc"
  else
    echo -e "\r  [❌] $desc"
    ERRORS=$((ERRORS + 1))
  fi
}

# ── 1. Syntaxe backend ────────────────────────────────────────────────
check "Syntaxe api.mjs" node --check backend/api.mjs
check "Syntaxe controllers" node --check backend/src/controllers/orders.js
check "Syntaxe middleware" node --check backend/src/middleware/auth.js

# ── 2. Fichiers requis existent ───────────────────────────────────────
check "api.mjs" test -f backend/api.mjs
check "health.js" test -f backend/src/controllers/health.js
check "orders.js" test -f backend/src/controllers/orders.js
check "stock.js" test -f backend/src/controllers/stock.js
check "users.js" test -f backend/src/controllers/users.js
check "auth middleware" test -f backend/src/middleware/auth.js
check "rateLimit middleware" test -f backend/src/middleware/rateLimit.js
check "PortalUser model" test -f backend/src/models/PortalUser.js
check "Order model" test -f backend/src/models/Order.js

# ── 3. Build Vite ─────────────────────────────────────────────────────
check "Build Vite (dry-run)" npx vite build --logLevel error

# ── 4. Tests unitaires ────────────────────────────────────────────────
if [ -f "node_modules/.bin/vitest" ]; then
  check "Tests unitaires" npx vitest run --reporter=verbose
fi

# ── Résultat ──────────────────────────────────────────────────────────
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "  ✅ Tout est OK — $ERRORS erreur(s). Prêt pour déploiement !"
else
  echo "  ❌ $ERRORS erreur(s) détectée(s) — corrigez avant déploiement."
fi
echo ""
exit $ERRORS
