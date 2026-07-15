# 🏭 RMASC FACTORY — Déploiement Professionnel

> **Serveur :** `192.168.1.95` (rmasc-local)  
> **Tunnel :** Cloudflare `rmasc-factory`  
> **Domaine :** `sarl-rmasc.com` (production)  
> **Date :** 2026-07-13

---

## 📋 Architecture

```
                     🌐 Internet
                         │
              ┌──────────┴──────────┐
              │  Cloudflare Tunnel  │
              │  rmasc-factory      │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │  Nginx (port 80/443)│
              │  Reverse Proxy      │
              └──────┬──────┬───────┘
                     │      │
          ┌──────────┘      └──────────┐
          ▼                             ▼
┌─────────────────┐          ┌──────────────────┐
│  Frontend (Vite)│          │  Backend Express  │
│  /opt/rmasc/dist│          │  Port 4000 (PM2)  │
│  Fichiers stat. │          │  API /api/*       │
└─────────────────┘          └────────┬─────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  MongoDB local    │
                            │  Port 27017       │
                            │  /rmasc-erp       │
                            └──────────────────┘
```

---

## 🚀 Déploiement Rapide

### Depuis votre machine de développement (Windows)

```bash
# 1. Build du frontend
cd d:\RMASC\RMASC
npm run build

# 2. Exécuter le script de déploiement automatique
bash deploy/scripts/deploy-rmasc.sh

# Ou étape par étape :
# 3. Copier les fichiers sur le serveur
rsync -az --delete dist/ sarlrmasc@192.168.1.95:/opt/rmasc/dist/
rsync -az --delete backend/ sarlrmasc@192.168.1.95:/opt/rmasc/backend/
rsync -az package.json sarlrmasc@192.168.1.95:/opt/rmasc/

# 4. Installer les dépendances et démarrer
ssh sarlrmasc@192.168.1.95
cd /opt/rmasc
npm install --production
cp deploy/configs/backend.env backend/.env
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
```

---

## 🔧 Configuration Détaillée

### 1. Base de données (MongoDB)

**Si MongoDB n'est pas installé** sur le serveur :

```bash
ssh sarlrmasc@192.168.1.95
sudo bash /opt/rmasc/deploy/scripts/setup-mongodb.sh
```

**Sinon**, vérifier que MongoDB tourne :

```bash
ssh sarlrmasc@192.168.1.95
sudo systemctl status mongod
# Si pas actif : sudo systemctl start mongod
```

**Seeder les utilisateurs par défaut** (première fois seulement) :

```bash
curl -X POST http://192.168.1.95/api/users/seed
```

### 2. Backend API (Node.js + PM2)

Le backend utilise **PM2** pour la gestion des processus :

```bash
# Démarrer
pm2 start /opt/rmasc/deploy/pm2/ecosystem.config.cjs

# Voir les logs
pm2 logs rmasc-api

# Redémarrer
pm2 restart rmasc-api

# Surveiller
pm2 monit

# Sauvegarder la config pour redémarrage auto
pm2 save
pm2 startup   # ← Ceci crée un service systemd
```

### 3. Nginx (Reverse Proxy)

```bash
# Installer la config
sudo cp /opt/rmasc/deploy/nginx/rmasc-app.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/rmasc-app.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Créer les certificats SSL auto-signés (pour le LAN)
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/rmasc.key \
  -out /etc/nginx/ssl/rmasc.crt \
  -subj "/CN=RMASC-Factory/O=RMASC/C=DZ"

# Tester et recharger
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Cloudflare Tunnel

```bash
# Installer cloudflared (si pas déjà fait)
curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Configurer
sudo mkdir -p /etc/cloudflared
sudo cp /opt/rmasc/deploy/cloudflare/tunnel-config.yml /etc/cloudflared/config.yml

# Authentifier (une seule fois)
cloudflared tunnel login

# Démarrer le tunnel
sudo cloudflared tunnel run rmasc-factory

# Ou avec systemd (démarrage auto)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 🌐 Accès

| Type | URL | Port |
|------|-----|------|
| **Local (LAN)** | `http://192.168.1.95` | 80 (Nginx) |
| **API Health** | `http://192.168.1.95/api/health` | 80 (Nginx) |
| **Backend direct** | `http://192.168.1.95:4000` | 4000 (Node) |
| **Externe** | `https://sarl-rmasc.com` | 443 (Cloudflare) |
| **Externe** | `https://sarl-rmasc.com` | 443 (Cloudflare) |

---

## 🛠️ Scripts de Maintenance

```bash
# Démarrer tous les services
sudo bash /opt/rmasc/deploy/scripts/start-production.sh

# Voir les logs
pm2 logs                    # Logs backend
sudo tail -f /var/log/nginx/rmasc-access.log   # Logs Nginx
sudo journalctl -u cloudflared -n 50           # Logs tunnel

# Status
pm2 status
sudo systemctl status nginx cloudflared mongod

# Redémarrer un service
pm2 restart rmasc-api
sudo systemctl reload nginx
sudo systemctl restart cloudflared

# Backup MongoDB
mongodump --out /var/backups/mongodb/$(date +%Y%m%d)
```

---

## 🔒 Sécurité

- **HTTPS** : Certificats auto-signés pour le LAN, SSL Cloudflare pour l'externe
- **HTTPS** : Certificats auto-signés pour le LAN, SSL Cloudflare pour l'externe
- **CORS** : Verrouillé sur `https://sarl-rmasc.com` et `http://localhost:5173` — pas de wildcard
- **JWT** : Authentification par token sur toutes les routes `/api/*` (sauf `/api/health`)
- **Dev-login** : Endpoint `/api/auth/dev-login` supprimé — aucune génération de token non authentifiée
- **MongoDB** : Bindé sur `127.0.0.1` uniquement (pas d'accès externe)
- **Headers de sécurité** : X-Frame-Options, XSS-Protection, HSTS

---

## 📁 Structure des Fichiers de Déploiement

```
deploy/
├── README-DEPLOY.md         ← Ce fichier
├── nginx/
│   └── rmasc-app.conf       ← Configuration Nginx
├── pm2/
│   └── ecosystem.config.cjs ← Gestion des processus PM2
├── cloudflare/
│   └── tunnel-config.yml    ← Configuration tunnel (ID: rmasc-factory)
├── configs/
│   └── backend.env          ← Variables d'environnement backend
└── scripts/
    ├── deploy-rmasc.sh      ← Déploiement automatisé
    ├── start-production.sh  ← Démarrage des services
    ├── setup-mongodb.sh     ← Installation MongoDB
    └── build-frontend.bat   ← Build Windows
```

---

## ❓ Dépannage

| Problème | Solution |
|----------|----------|
| `502 Bad Gateway` | Nginx ne peut pas joindre le backend. Vérifiez `pm2 status` |
| `ECONNREFUSED MongoDB` | MongoDB n'est pas démarré : `sudo systemctl start mongod` |
| Tunnel Cloudflare down | `sudo systemctl restart cloudflared` |
| API lent | Vérifier `pm2 monit` pour la mémoire CPU |
| Erreur CORS | Vérifier la config Nginx, les headers sont déjà ajoutés |
| Page blanche | Vérifier que `dist/` existe et est bien copié |
| `page not found` | Vérifier que `try_files $uri /index.html` est dans la config Nginx |
