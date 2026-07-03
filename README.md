# 🏭 RMASC FACTORY — ERP Ascenseur

**Progiciel de Gestion Intégré pour l'Industrie Ascenseur**

Application web full-stack déployée sur Vercel avec base de données Neon PostgreSQL.

---

## 🚀 Déploiement Express (Vercel)

1. **Poussez sur GitHub :**
   ```bash
   git add -A
   git commit -m "Deploy v2.5.3"
   git push
   ```

2. **Importez le repo** sur [vercel.com](https://vercel.com)

3. **Ajoutez les variables d'environnement :**
   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | Neon PostgreSQL poolé |
   | `DIRECT_URL` | Neon PostgreSQL direct |
   | `JWT_SECRET` | Chaîne aléatoire 64 caractères |

4. **Déployez.** — Le frontend et l'API sont servis depuis la même URL.

---

## 🔗 Architecture

```
rmasc-factory/
├── src/                    # React + Vite (Frontend)
│   ├── components/         # 20+ composants métier
│   ├── config/             # Client API, store runtime
│   └── data/               # Authentification, stockage local
├── backend/
│   ├── api.mjs             # Entry point serverless Vercel
│   ├── prisma/             # Schéma PostgreSQL (Neon)
│   └── src/                # Routes Express, contrôleurs, services
├── public/                 # Assets statiques
├── vercel.json             # Configuration Vercel
└── vite.config.ts          # Build Vite
```

**Stack :** React 18 · TypeScript · Tailwind CSS · Vite · Express · Prisma · PostgreSQL (Neon) · Zod · JWT

---

## 🔐 Identifiants par défaut

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| 👑 Administration | `admin` | `admin123` |
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
npx prisma db push    # Crée les tables PostgreSQL
npx tsx src/index.ts  # API sur http://localhost:4000
```

> L'API proxy est configurée dans `vite.config.ts` — le frontend (`:5173`) transmet `/api/*` au backend (`:4000`).

---

© 2026 RMASC. Tous droits réservés.
