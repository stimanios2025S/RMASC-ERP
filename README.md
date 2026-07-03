# 🏭 RMASC FACTORY — ERP Ascenseur v2.5.3

**Progiciel de Gestion Intégré pour l'Industrie Ascenseur**

Production-ready web application deployed on Vercel with Neon PostgreSQL backend.

---

## 🚀 Quick Deploy

### Prerequisites
- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account
- [Neon](https://neon.tech) PostgreSQL database

### One-Click Deploy

1. Push to GitHub: `git push`
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL` — Neon pooled connection string
   - `DIRECT_URL` — Neon direct connection string  
   - `JWT_SECRET` — Random 64-character secret

4. Deploy. Done.

---

## 🔐 Login

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Engineer 1 | `ingenieur1` | `ingenieur1` |
| Engineer 2 | `ingenieur2` | `ingenieur2` |
| Verifier | `verificateur` | `verificateur` |
| Production | `production` | `production` |
| Stock | `magasinier` | `magasinier` |

---

## 🏗️ Architecture

```
RMASC-ERP/
├── src/                 # React + Vite Frontend
│   ├── components/      # 20+ React components
│   ├── config/          # API client, runtime store
│   └── data/            # Auth, local store
├── backend/
│   ├── api.mjs          # Vercel serverless API entry
│   ├── prisma/          # PostgreSQL schema (Neon)
│   └── src/             # Express routes, controllers
├── vercel.json          # Monorepo config (frontend + backend)
└── vite.config.ts       # Vite build config
```

## 📦 Modules

- **Ajouter Ascenseur** — Multi-step wizard with Salim Hamoun AI dimension calculator
- **Bureau d'Études** — Engineer portal with file vault and document tracking
- **Facturation** — Automated invoicing with owner pricing matrix
- **Validations** — Admin approval workflow for engineering plans
- **Production** — 7-stage manufacturing pipeline
- **Pipeline Cycle de Vie** — Full order lifecycle tracking
- **Paramètres** — User management and settings

---

© 2026 RMASC. Tous droits réservés.
