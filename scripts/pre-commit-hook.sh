#!/bin/sh
# ─── RMASC FACTORY — Pre-commit Hook ──────────────────────────────────────
# Installation : copier ce fichier vers .git/hooks/pre-commit
# Commande : cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "🔍 Pre-commit check — RMASC FACTORY"

# 1. Vérifier le TypeScript frontend
echo "  📦 Vérification TypeScript..."
npx tsc --noEmit 2>/dev/null
if [ $? -ne 0 ]; then
  echo "  ❌ TypeScript: erreurs. Lancez : npm run typecheck"
  exit 1
fi
echo "  ✅ TypeScript OK"

# 2. Tests (si disponibles)
if [ -f "node_modules/.bin/vitest" ]; then
  echo "  📦 Tests..."
  npx vitest run --reporter=verbose 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "  ❌ Tests échouent."
    exit 1
  fi
  echo "  ✅ Tests OK"
fi

echo "  ✅ Tout est bon — commit autorisé"
exit 0
