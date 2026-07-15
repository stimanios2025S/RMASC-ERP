# 🏭 RMASC FACTORY — ERP Ascenseur

**Progiciel de Gestion Intégré pour l'Industrie Ascenseur**

Application web full-stack déployée sur serveur dédié (HP ProLiant) avec MongoDB auto-hébergé et tunnel Cloudflare.

🌐 **Production :** [https://sarl-rmasc.com](https://sarl-rmasc.com)

---

## 🔗 Architecture

```
rmasc-factory/
├── src/                    # React + Vite (Frontend)
│   ├── components/         # 20+ composants métier
│   │   ├── agent/          # Assistant IA Salim Hamoun
│   │   └── smart/          # Recherche, notifications, tips
│   ├── config/             # Client API, notifications, runtime store
│   └── data/               # Authentification, stockage local
├── backend/
│   ├── api.mjs             # Serveur Express permanent (port 4000)
│   └── src/
│       ├── models/         # Mongoose schemas (Order, StockItem, etc.)
│       ├── lib/            # MongoDB connection, env loader
│       └── config/         # Webhook keys
├── deploy/
│   ├── nginx/              # Configuration Nginx reverse proxy
│   ├── pm2/                # PM2 ecosystem config
│   ├── cloudflare/         # Tunnel Cloudflare configuration
│   ├── configs/            # Variables d'environnement production
│   └── scripts/            # Déploiement automatisé
├── public/                 # Assets statiques
└── vite.config.ts          # Build Vite
```

**Stack :** React 18 · TypeScript · Tailwind CSS · Vite · Express · Mongoose · MongoDB · JWT · PM2 · Nginx · Cloudflare Tunnel

---

## 🔐 Identifiants par défaut

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| 👑 Administration | `salim` | `salim123` |
| 👑 Administration | `chergui_ghani` | `chergui123` |
| 📐 Ingénieur Dessinateur 1 | `ingenieur1` | `ingenieur1` |
| ✏️ Ingénieur Dessinateur 2 | `ingenieur2` | `ingenieur2` |
| 🔍 Vérificateur | `verificateur` | `verificateur` |
| 🏭 Production | `production` | `production` |
| 📦 Magasinier | `magasinier` | `magasinier` |

---

## 🧩 Modules fonctionnels

| Module | Description |
|--------|-------------|
| **Ajouter un ascenseur** | Assistant 6 étapes avec calculateur Salim Hamoun AI (normes EN 81-20/50) |
| **Bureau d'Études** | Portail ingénieurs — dépôt de fichiers, validation des plans |
| **Facturation** | Devis automatique basé sur la matrice tarifaire propriétaire |
| **Validations** | Workflow d'approbation des plans techniques |
| **Production** | Pipeline de fabrication en 7 phases |
| **Cycle de Vie** | Suivi complet du cycle de vie des commandes |
| **Stocks** | Gestion des articles, fournisseurs, mouvements et documents |
| **Paramètres** | Gestion des utilisateurs et configuration système |

---

## 🖥️ Développement local

```bash
# Frontend
npm install
npm run dev

# Backend (dans un second terminal)
cd backend
npm install
npx tsx src/index.ts  # API sur http://localhost:4000
```

> L'API proxy est configurée dans `vite.config.ts` — le frontend (`:5173`) transmet `/api/*` au backend (`:4000`).

---

## 🚀 Déploiement

```bash
# Déploiement complet depuis Windows
.\deploy-rmasc.ps1

# Ou via le script bash
bash deploy/scripts/deploy-rmasc.sh

# Voir le guide détaillé
cat deploy/README-DEPLOY.md
```

## 🔒 Sécurité

- **CORS** : Verrouillé sur `https://sarl-rmasc.com` et `http://localhost:5173`
- **JWT** : Tokens 24h avec bcrypt (12 rounds) pour les mots de passe
- **Dev-login** : Endpoint `/api/auth/dev-login` définitivement supprimé
- **MongoDB** : Bindé sur `127.0.0.1` uniquement
- **HTTPS** : Géré par Cloudflare (edge) + certificats auto-signés (LAN)

---

© 2026 RMASC. Tous droits réservés.
