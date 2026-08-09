#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Install Watchdog 🛡️
#  Installe + démarre l'agent de garde comme service système permanent.
#
#  Usage (2 étapes rapides) :
#    1. Crée ton bot Telegram (2 min) :
#         - Ouvre Telegram → cherche @BotFather → /newbot → choisis un nom
#         - BotFather te donne le TOKEN (ex: 123456:ABC-DEF...)
#         - Ouvre TON bot (le lien @tonbot) et envoie-lui un message: "salut"
#         - Récupère ton CHAT_ID : curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates"
#           → cherche "chat":{"id":123456789} — c'est ton CHAT_ID
#
#    2. Installe :
#         bash scripts/watchdog/install.sh <TOKEN> <CHAT_ID>
#
#  Une fois installé, il tourne tout seul. Pour voir son état :
#         systemctl status rmasc-watchdog
#         tail -f /tmp/rmasc-watchdog.log
# ═══════════════════════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")/../.."   # → racine du repo
PROJECT_ROOT="$(pwd)"

TOKEN="${1:-$TELEGRAM_BOT_TOKEN}"
CHAT_ID="${2:-$TELEGRAM_CHAT_ID}"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  🛡️ RMASC Guard — Installation              ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ── Vérifications ──
if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "  ❌ Il manque le TOKEN ou le CHAT_ID."
  echo ""
  echo "  Usage : bash scripts/watchdog/install.sh <TOKEN> <CHAT_ID>"
  echo "  (ou exporte TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID)"
  echo ""
  echo "  Pour obtenir un TOKEN : Telegram → @BotFather → /newbot"
  echo "  Pour le CHAT_ID : envoie un message à ton bot puis :"
  echo "    curl -s \"https://api.telegram.org/bot<TOKEN>/getUpdates\""
  exit 1
fi

if [ ! -f "scripts/watchdog/watchdog.mjs" ]; then
  echo "  ❌ watchdog.mjs introuvable — lance depuis la racine du repo."
  exit 1
fi

# ── 1. Fichier de config système ──
echo "  📝 Écriture de /etc/rmasc-watchdog.env (config)..."
sudo tee /etc/rmasc-watchdog.env > /dev/null <<EOF
TELEGRAM_BOT_TOKEN=${TOKEN}
TELEGRAM_CHAT_ID=${CHAT_ID}
WATCHDOG_SERVICE=rmasc-erp
WATCHDOG_HEALTH_URL=http://localhost:4001/api/health
WATCHDOG_CHECK_INTERVAL=30000
WATCHDOG_LOG_SCAN_INTERVAL=60000
WATCHDOG_MAX_RESTARTS=3
WATCHDOG_RESTART_WINDOW=600000
EOF
sudo chmod 600 /etc/rmasc-watchdog.env

# ── 2. Service système ──
echo "  📦 Installation du service système..."
sudo cp scripts/watchdog/rmasc-watchdog.service /etc/systemd/system/rmasc-watchdog.service
sudo systemctl daemon-reload
sudo systemctl enable rmasc-watchdog > /dev/null 2>&1 || true

# ── 3. Test d'alerte AVANT de lancer (valide token + chat_id) ──
echo "  🧪 Test d'alerte Telegram..."
TEST_OUTPUT=$(sudo -E env TELEGRAM_BOT_TOKEN="$TOKEN" TELEGRAM_CHAT_ID="$CHAT_ID" \
  node scripts/watchdog/watchdog.mjs --test-alert 2>&1 || true)
echo "$TEST_OUTPUT" | tail -3

if echo "$TEST_OUTPUT" | grep -q "Telegram API\|TOKEN INVALIDE\|inaccessible"; then
  echo ""
  echo "  ⚠️  Le test a échoué — le service n'est PAS démarré."
  echo "  Vérifie le TOKEN (message 401 = token faux) et le CHAT_ID."
  exit 1
fi

# ── 4. Démarrage ──
echo "  ▶️  Démarrage du service..."
sudo systemctl restart rmasc-watchdog
sleep 2

echo ""
echo "  ── État ──"
systemctl status rmasc-watchdog --no-pager | head -12
echo ""
echo "  ✅ RMASC Guard installé et actif !"
echo ""
echo "  📍 Vérifier :       systemctl status rmasc-watchdog"
echo "  📍 Logs en direct : tail -f /tmp/rmasc-watchdog.log"
echo "  📍 Re-tester :      node scripts/watchdog/watchdog.mjs --test-alert"
echo "  📍 Vérifier santé : node scripts/watchdog/watchdog.mjs --once"
echo ""
