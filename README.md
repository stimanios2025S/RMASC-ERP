# 🏭 RMASC FACTORY — ERP Ascenseur

**Progiciel de Gestion Intégré pour l'Industrie Ascenseur**
Version **2.6.2** — MongoDB Edition

Application web full-stack hébergée sur serveur dédié avec MongoDB auto-hébergé et tunnel Cloudflare.

🌐 **Production :** [https://sarl-rmasc.com](https://sarl-rmasc.com)
🖥️ **Backend API :** `http://localhost:4001`
💾 **Base de données :** `mongodb://localhost:27017/rmasc-erp`

---

## 🧱 Architecture Technique

```
🌐 Internet
    │
    ▼
☁️ Cloudflare Tunnel ───→ http://localhost:4001
    │                      (Backend Express)
    ▼
https://sarl-rmasc.com    sert aussi le frontend build (dist/)
```

- **Frontend :** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend :** Express.js + Mongoose + JWT
- **Base :** MongoDB (locale, port 27017)
- **Process :** Lancé via `nohup node backend/api.mjs &` (pas de PM2)
- **CDN :** Cloudflare Tunnel (pas de Nginx en production)

---

## 🔗 Modules Fonctionnels

| Module | Description |
|--------|-------------|
| **Ajouter un ascenseur** | Assistant 6 étapes avec calculateur Salim Hamoun AI (normes EN 81-20/50) |
| **Bureau d'Études** | Portail ingénieurs — dépôt de fichiers CAO, validation des plans |
| **Facturation** | Devis automatique basé sur la matrice tarifaire propriétaire |
| **Validations** | Workflow d'approbation des plans techniques |
| **Production** | Pipeline de fabrication en 7 phases (découpe → livraison) |
| **Cycle de Vie** | Suivi complet du cycle de vie des commandes |
| **Stocks** | Gestion des articles, fournisseurs, mouvements et documents |
| **Assistant IA Salim** | Agent conversationnel intégré avec capacités de reconnaissance d'images |
| **Sync Multi-Appareils** | SSE temps réel — tous les appareils synchronisés instantanément |

---

## 🚀 Déploiement Rapide

> 📖 **Guide complet** → [`DEPLOY-GUIDE.md`](./DEPLOY-GUIDE.md)

```powershell
cd C:\Users\stimanios\RMASC-ERP
npm run build
ssh sarlrmasc@100.73.62.52
```

**Une fois en SSH :**
```bash
cd /home/sarlrmasc/rmasc-erp
git pull origin main
npm ci && npm run build
pm2 kill
pkill -f node
PORT=4001 nohup node backend/api.mjs > /tmp/rmasc.log 2>&1 &
```

---

## 🔐 Identifiants (rotés en v2.7.9 — les anciens ne fonctionnent plus)

> ⚠️ **Confidentiel** : ne pas afficher ces identifiants sur l'écran de connexion ni les partager publiquement.

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| 👑 Admin — Salim | `salim.rmasc` | `Rm#Salim2026!` |
| 👑 Admin — Chergui El Ghani | `ghani.rmasc` | `Rm#Ghani2026!` |
| 👑 Admin — Chergui Nassim | `nassim.rmasc` | `Rm#Nassim2026!` |
| 👑 Admin — Chergui Said | `said.rmasc` | `Rm#Said2026!` |
| 👑 Admin — Chergui El Aziz | `aziz.rmasc` | `Rm#Aziz2026!` |
| 📐 Ingénieur Dessinateur 1 | `karim.be1` | `Rm#Karim2026!` |
| ✏️ Ingénieur Dessinateur 2 | `yasmine.be2` | `Rm#Yasmine2026!` |
| 🔍 Vérificateur | `rachid.verif` | `Rm#Rachid2026!` |
| 🏭 Production 1 | `said.prod1` | `Rm#Prod1_2026!` |
| 🏭 Production 2 | `chef.prod2` | `Rm#Prod2_2026!` |
| 📦 Magasinier | `ahmed.mag` | `Rm#Ahmed2026!` |

---

## 🔒 Sécurité

- **JWT** : Tokens 24h avec bcrypt (12 rounds)
- **Rate Limiting** : 5 req/min login, 200 req/min API
- **Audit Logs** : Toutes les actions enregistrées dans MongoDB
- **CORS** : Verrouillé sur `https://sarl-rmasc.com`
- **Zod Validation** : Tous les endpoints validés côté serveur
- **MongoDB** : Bindé sur `127.0.0.1` uniquement

---

## 🧪 Développement Local

```bash
# Backend
cd backend
npm install
node api.mjs              # API sur http://localhost:4000

# Frontend (autre terminal)
npm install
npm run dev               # Vite sur http://localhost:5173
```

> Le proxy Vite est configuré pour transmettre `/api/*` vers `localhost:4000`.

---

## 📊 Monitoring

| Service | URL | Description |
|---------|-----|-------------|
| **Sentry** | Tableau de bord Sentry | Tracking d'erreurs temps réel |
| **Site** | https://sarl-rmasc.com | ERP en production |
| **API Health** | https://sarl-rmasc.com/api/health | Statut du backend |
| **API Version** | https://sarl-rmasc.com/api/version | Version déployée |

---

## 📋 Scripts de Maintenance

```bash
# Backup complet (MongoDB + uploads)
sudo bash scripts/backup.sh

# Vérification pré-déploiement
bash scripts/verify-deploy.sh
```

---

© 2026 RMASC. Tous droits réservés. Propriétaire — UNLICENSED
