# 🏭 RMASC FACTORY — Guide de Déploiement Rapide

## 🚀 Déployer après une modification

### Depuis votre PC Windows (recommandé)

Après avoir fait vos modifications dans le code :

**Option A — Déploiement complet (build + upload + reload) :**
```powershell
.\deploy-rmasc.ps1
```

**Option B — Juste le frontend (si vous avez changé que le design) :**
```powershell
.\deploy-rmasc.ps1 -Quick
```

**Option C — Juste le backend (si vous avez changé l'API) :**
```powershell
.\deploy-rmasc.ps1 -Backend
```

**Option D — Vérifier l'état des services :**
```powershell
.\deploy-rmasc.ps1 -Status
```

Ou double-cliquez sur **`deploy-rmasc.bat`** pour un déploiement complet automatique.

### Depuis le serveur (si vous êtes déjà en SSH)

```bash
# Rebuild + restart tout
sudo bash /opt/rmasc/deploy/scripts/quick-update.sh

# Recharger juste le frontend
sudo bash /opt/rmasc/deploy/scripts/quick-update.sh frontend

# Redémarrer juste le backend
sudo bash /opt/rmasc/deploy/scripts/quick-update.sh backend

# Voir l'état
sudo bash /opt/rmasc/deploy/scripts/quick-update.sh status
```

---

## 📋 Architecture

```
Windows (dev)                          Linux Server (192.168.1.95)
┌─────────────┐                        ┌─────────────────────────────┐
│ d:\RMASC\   │                        │ /opt/rmasc/                 │
│   RMASC\    │    scp / rsync         │   ├── dist/        ← Frontend statique
│   ├── src/  │  ──────────────────►   │   ├── backend/     ← API Node.js
│   ├── dist/ │                        │   ├── deploy/      ← Configs Nginx/PM2
│   └── deploy-rmasc.ps1               │   ├── package.json
│                                      │   └── configs/
├── Frontend React (Vite)              │   PM2 (process manager)
├── Backend Express                    │   Nginx (port 80) ← reverse proxy
│                                      │   Cloudflare Tunnel → sarl-rmasc.com
└─────────────┘                        └─────────────────────────────┘
```

---

## 🛠️ Commandes utiles sur le serveur

| Commande | Description |
|----------|-------------|
| `pm2 logs rmasc-backend` | Voir les logs en temps réel |
| `pm2 monit` | Monitorer CPU/RAM |
| `pm2 restart rmasc-backend` | Redémarrer l'API |
| `sudo systemctl reload nginx` | Recharger Nginx |
| `sudo systemctl restart cloudflared` | Redémarrer le tunnel |
| `sudo systemctl status mongod` | Vérifier MongoDB |
| `curl http://localhost:80/api/health` | Tester l'API |

---

## 🔄 Cycle de déploiement typique

1. Vous modifiez le code sur votre PC (`src/components/Dashboard.tsx`, etc.)
2. Vous lancez `.\deploy-rmasc.ps1`
3. Le script **build** le frontend, **upload** les fichiers, **reload** les services
4. Vous testez sur **`https://sarl-rmasc.com`**
5. C'est en ligne ! ✨
