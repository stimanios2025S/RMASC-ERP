# 🚀 RMASC FACTORY ERP — Guide de Déploiement

> **⚠️ INFRASTRUCTURE ACTUELLE :**
> - **Process :** Lancé avec `nohup node backend/api.mjs &` (pas de PM2)
> - **Port :** `4001` (Cloudflare tunnel → `http://localhost:4001`)
> - **Dossier :** `/home/sarlrmasc/rmasc-erp`
> - **Dépôt GitHub :** `stimanios2025S/RMASC-ERP` (branche `main`)
> - **Base :** MongoDB locale `mongodb://localhost:27017/rmasc-erp`

---

## ⚡ À FAIRE APRÈS UNE MODIFICATION DU CODE

### 1️⃣ Pusher les changements sur GitHub

```powershell
cd C:\Users\stimanios\RMASC-ERP
git add -A
git commit -m "Description des changements"
git push origin main
```

### 2️⃣ Se connecter au serveur

```powershell
ssh sarlrmasc@100.73.62.52
```

### 3️⃣ Récupérer et builder (dans le terminal SSH)

```bash
cd /home/sarlrmasc/rmasc-erp
git pull origin main
npm ci
npm run build
```

### 4️⃣ Redémarrer le serveur

```bash
# Tuer l'ancien processus
pkill -f "node backend/api.mjs" || true
sleep 2

# Redémarrer sur le port 4001
PORT=4001 nohup node backend/api.mjs > /tmp/rmasc.log 2>&1 &
sleep 3

# Vérifier
curl http://localhost:4001/api/version
curl http://localhost:4001/api/health
```

✅ Si les deux curl retournent du JSON, **c'est bon.**

---

## ⚡ DÉPLOIEMENT RAPIDE (une seule commande)

SSH + tout faire d'un coup :

```bash
ssh sarlrmasc@100.73.62.52 "cd /home/sarlrmasc/rmasc-erp && git pull origin main && npm ci && npm run build && pkill -f 'node backend/api.mjs' || true && sleep 2 && PORT=4001 nohup node backend/api.mjs > /tmp/rmasc.log 2>&1 & sleep 3 && curl -s http://localhost:4001/api/version"
```

---

## 🔄 APRÈS UNE COUPURE DE COURANT / REDÉMARRAGE DU SERVEUR

```bash
ssh sarlrmasc@100.73.62.52

# Lancer MongoDB (si pas déjà démarré)
sudo systemctl start mongod

# Lancer le backend
cd /home/sarlrmasc/rmasc-erp
PORT=4001 nohup node backend/api.mjs > /tmp/rmasc.log 2>&1 &
sleep 3
curl http://localhost:4001/api/health
```

---

## 🩺 VÉRIFIER L'ÉTAT DU SERVEUR

```bash
# Santé de l'API
curl https://sarl-rmasc.com/api/health

# Version déployée
curl https://sarl-rmasc.com/api/version

# MongoDB
sudo systemctl status mongod

# Processus backend
ps aux | grep "node backend/api.mjs"

# Logs
tail -50 /tmp/rmasc.log
```

---

## 🆘 DÉPANNAGE

| Problème | Solution |
|----------|----------|
| `Connection refused` | Le backend n'est pas lancé → `cd /home/sarlrmasc/rmasc-erp && PORT=4001 nohup node backend/api.mjs > /tmp/rmasc.log 2>&1 &` |
| `MongoDB indisponible` | `sudo systemctl start mongod` |
| `Route API introuvable` | L'ancien processus tourne encore → `pkill -f "node backend/api.mjs"` puis relancer |
| Site ne répond pas | Vérifier Cloudflare Tunnel → `cloudflared tunnel list` |
| `Version Mismatch` | Le build n'a pas été refait → `npm run build` puis redémarrer |

---

## 💾 BACKUP

```bash
# Backup manuel
sudo bash /home/sarlrmasc/rmasc-erp/scripts/backup.sh

# Backup automatique (via cron)
# sudo crontab -e
# 0 2 * * * sudo bash /home/sarlrmasc/rmasc-erp/scripts/backup.sh
```

---

> Dernière mise à jour : 28/07/2026 — RMASC FACTORY ERP v2.6.2
