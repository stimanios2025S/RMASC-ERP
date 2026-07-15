#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Démarrage automatique des services
#  Envoie ce fichier à l'usine → double-clic → tout démarre
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║    RMASC FACTORY — Démarrage                 ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# 1. Démarrer le backend MongoDB/Express
echo "  [1/4] Démarrage du backend..."
cd /opt/rmasc-core/backend 2>/dev/null || cd ~/RMASC/backend 2>/dev/null || cd /home/sarlrmasc/RMASC/backend 2>/dev/null || echo "  ⚠️ Dossier backend non trouvé"
nohup node api.mjs > /var/log/rmasc-backend.log 2>&1 &
echo "  ✅ Backend lancé"

# 2. Attendre 3 secondes
sleep 3

# 3. Démarrer le frontend Vite
echo "  [2/4] Démarrage du frontend..."
cd /opt/rmasc-core 2>/dev/null || cd ~/RMASC 2>/dev/null || cd /home/sarlrmasc/RMASC 2>/dev/null || echo "  ⚠️ Dossier frontend non trouvé"
nohup npx vite --host 0.0.0.0 --port 5173 > /var/log/rmasc-frontend.log 2>&1 &
echo "  ✅ Frontend lancé"

# 4. Vérifier que tout écoute
echo "  [3/4] Vérification..."
sleep 3

if ss -tlnp 2>/dev/null | grep -q ":4000"; then
    echo "  ✅ Backend  port 4000  → OK"
else
    echo "  ⚠️  Backend  port 4000  → PAS OK"
fi

if ss -tlnp 2>/dev/null | grep -q ":5173"; then
    echo "  ✅ Frontend port 5173 → OK"
else
    echo "  ⚠️  Frontend port 5173 → PAS OK"
fi

# 5. Redémarrer cloudflared
echo "  [4/4] Redémarrage du tunnel Cloudflare..."
systemctl restart cloudflared 2>/dev/null || echo "  ⚠️ cloudflared non trouvé comme service"
echo "  ✅ Terminé"

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  Si tout est OK, teste sur ton téléphone :  │"
echo "  │  https://sarl-rmasc.com                    │"
echo "  └─────────────────────────────────────────────┘"
echo ""
