#!/bin/bash
# ─── RMASC FACTORY — Script de vérification pré-déploiement ───────────────
# Lance toutes les vérifications en une commande.
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
check "Syntaxe backend (api.mjs)" node --check backend/api.mjs
check "Syntaxe controllers" node --check backend/src/controllers/orders.js
check "Syntaxe middleware auth" node --check backend/src/middleware/auth.js
check "Syntaxe middleware rateLimit" node --check backend/src/middleware/rateLimit.js
check "Syntaxe schemas validation" node --check backend/src/schemas/validation.js

# ── 2. Fichiers requis existent ───────────────────────────────────────
check "api.mjs existe" test -f backend/api.mjs
check "middleware/auth.js existe" test -f backend/src/middleware/auth.js
check "middleware/rateLimit.js existe" test -f backend/src/middleware/rateLimit.js
check "middleware/audit.js existe" test -f backend/src/middleware/audit.js
check "schemas/validation.js existe" test -f backend/src/schemas/validation.js
check "controllers/orders.js existe" test -f backend/src/controllers/orders.js
check "controllers/stock.js existe" test -f backend/src/controllers/stock.js
check "controllers/users.js existe" test -f backend/src/controllers/users.js
check "controllers/catalog.js existe" test -f backend/src/controllers/catalog.js
check "controllers/parts.js existe" test -f backend/src/controllers/parts.js
check "controllers/notifications.js existe" test -f backend/src/controllers/notifications.js
check "ui/Icon.tsx existe" test -f src/components/ui/Icon.tsx
check "ui/Skeleton.tsx existe" test -f src/components/ui/Skeleton.tsx
check "ui/StatusBadge.tsx existe" test -f src/components/ui/StatusBadge.tsx
check "vitest.config.ts existe" test -f vitest.config.ts

# ── 3. Vite peut builder ──────────────────────────────────────────────
check "Build Vite (dry-run)" npx vite build --logLevel error

# ── 4. Tests ──────────────────────────────────────────────────────────
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
