# 🏭 RMASC ERP — Plan d'Action Professionnel

## 📊 État des Lieux (v2.6.0 — Juillet 2026)

- Bundle JS: **981 KB** (trop lourd → doit être < 400 KB)
- Pages: **42 composants** React
- Base de données: MongoDB (1-4ms latency)
- Serveur: 56 cœurs Xeon, 46GB RAM
- Déploiement: systemd + SSH key (passwordless)

---

## 🔴 Phase 1 — Performance & Taille (JOUR 1)

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 1.1 | Lazy load Sentry (réduit bundle de 300KB) | `vite.config.ts`, `main.tsx` | 🔥 Bundle 981KB → **650KB** |
| 1.2 | Code-split des composants lourds (dashboard, portals) | `vite.config.ts` | 🔥 Bundle 650KB → **450KB** |
| 1.3 | Lazy load des icônes (Icon.tsx) | `Icon.tsx` | Bundle 450KB → **380KB** |
| 1.4 | Supprimer les logs console en prod | `vite.config.ts` | Performance rendering |
| 1.5 | Ajouter compression gzip au serveur | `backend/api.mjs` | Transfert 380KB → **120KB** |

## 🟡 Phase 2 — Fonctionnalités (JOUR 2-3)

| # | Tâche | Fichiers | Priorité |
|---|-------|----------|----------|
| 2.1 | Pagination des commandes (50/page) | `backend/controllers/orders.js`, `Dashboard.tsx` | 🔥 |
| 2.2 | Dashboard analytics (CA, tendances 30j) | `stats.js`, `Dashboard.tsx` | 🔥 |
| 2.3 | Génération PDF facture avec cachet | `InvoicingPage.tsx`, nouveau endpoint | 🔥 |
| 2.4 | Export Excel des commandes | `MesCommandesPage.tsx` | 🟡 |
| 2.5 | Filtres avancés (date, statut, priorité) | `Dashboard.tsx`, `IngenieurPortal.tsx` | 🟡 |

## 🟢 Phase 3 — UX & Design (JOUR 3-4)

| # | Tâche | Fichiers | Priorité |
|---|-------|----------|----------|
| 3.1 | Icônes SVG custom (remplacer émojis) | `Icon.tsx` | 🟡 |
| 3.2 | Dark/Light mode | `index.css`, `App.tsx` | 🟢 |
| 3.3 | Responsive mobile final | Tous les composants | 🟢 |
| 3.4 | Animations de transition (pages, modales) | `index.css` | 🟢 |

## 🔵 Phase 4 — Infrastructure (JOUR 4-5)

| # | Tâche | Fichiers | Priorité |
|---|-------|----------|----------|
| 4.1 | Cache Redis pour stats | `backend/api.mjs` | 🟡 |
| 4.2 | Rate limiting API | `backend/middleware/rateLimit.js` | 🟡 |
| 4.3 | Backups automatiques MongoDB | Script serveur | 🟡 |
| 4.4 | Monitoring New Relic | `backend/api.mjs` | 🟢 |

---

## 📦 Résultat Final Attendu

| Métrique | Avant | Après |
|----------|-------|-------|
| **Bundle JS** | 981 KB | ~250 KB |
| **Temps de chargement** | ~3s | < 1s |
| **Pages avec pagination** | 0 | 3 |
| **Dashboard analytics** | Stats basiques | Graphiques + tendances |
| **Export PDF/Excel** | Aucun | PDF facture + Excel commandes |
| **Icônes** | Émojis | SVG custom professionnels |
| **Dark/Light mode** | Dark only | Dark + Light |
