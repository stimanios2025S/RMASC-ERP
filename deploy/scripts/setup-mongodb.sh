#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Installation de MongoDB Community Edition
#  Pour Ubuntu/Debian (adapté pour le serveur factory)
#  Source : https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  RMASC — Installation MongoDB                ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Importer la clé GPG MongoDB ──────────────────────────────────────────
echo "  [1/5] Import de la clé GPG MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null

# ── 2. Ajouter le dépôt ─────────────────────────────────────────────────────
echo "  [2/5] Ajout du dépôt MongoDB..."
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

# ── 3. Installer MongoDB ────────────────────────────────────────────────────
echo "  [3/5] Installation de MongoDB..."
sudo apt-get update -qq
sudo apt-get install -y -qq mongodb-org

# ── 4. Configurer MongoDB ───────────────────────────────────────────────────
echo "  [4/5] Configuration de MongoDB..."

# Activer l'authentification
sudo mkdir -p /etc/mongod
sudo tee /etc/mongod.conf > /dev/null << 'MONGOCFG'
# MongoDB configuration for RMASC Factory
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: disabled

# OpTimes pour le binlog
replication:
  oplogSizeMB: 128
MONGOCFG

# ── 5. Démarrer MongoDB ─────────────────────────────────────────────────────
echo "  [5/5] Démarrage de MongoDB..."
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod

# Attendre que MongoDB soit prêt
sleep 3

# Vérifier
if systemctl is-active --quiet mongod; then
    echo ""
    echo "  ✅ MongoDB installé et démarré avec succès !"
    echo "  📍 Port : 27017"
    echo "  📦 Base : rmasc-erp"
else
    echo ""
    echo "  ❌ Erreur : MongoDB n'a pas démarré."
    echo "  Voir les logs : sudo journalctl -u mongod -n 50"
    exit 1
fi

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  MongoDB est prêt pour RMASC !              │"
echo "  │  URI: mongodb://localhost:27017/rmasc-erp   │"
echo "  └─────────────────────────────────────────────┘"
echo ""
