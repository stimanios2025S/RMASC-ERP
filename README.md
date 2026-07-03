# 🏭 RMASC FACTORY — Progiciel de Gestion Intégré

**Version 2.5.2** — Application de bureau professionnelle

Système ERP complet pour la gestion des commandes d'ascenseurs, intégrant le Bureau d'Études, le suivi de Production, et la synchronisation directe avec l'atelier.

---

## 📦 Installation Rapide

### Prérequis

- **Node.js** 18+ (Recommandé : 20 LTS)
- **Windows** 10/11 (Application native)
- Accès Internet pour la base de données Neon PostgreSQL (Cloud)

### Méthode 1 : Installateur Windows

```powershell
# 1. Build complet avec installateur
scripts\build.bat --installer

# 2. L'installateur se trouve dans :
#    D:/RMASC-FACTORY-BUILD/RMASC FACTORY-Setup-2.0.0.exe

# 3. Exécutez l'installateur et suivez les instructions
```

### Méthode 2 : Dossier portable (sans installation)

```powershell
# 1. Build rapide
scripts\build.bat

# 2. Lancez directement depuis :
#    D:/RMASC-FACTORY-BUILD/win-unpacked/RMASC FACTORY.exe
```

### Méthode 3 : Mode Développement

```powershell
# Terminal 1 : Backend API
cd backend
npm install
npx prisma generate
npx tsx src/index.ts

# Terminal 2 : Frontend + Electron
npm install
npm run dev:electron
```

---

## 🔐 Identifiants de Connexion

| Portail | Identifiant | Mot de passe | Page d'accueil |
|---------|-------------|--------------|----------------|
| 👑 **Direction** | `admin` | `admin123` | Tableau de bord |
| 📐 **Bureau d'Études 1** | `ingenieur1` | `ingenieur1` | Plan Installation |
| ✏️ **Bureau d'Études 2** | `ingenieur2` | `ingenieur2` | Dessin 2D Cabine |
| 🔍 **Vérificateur** | `verificateur` | `verificateur` | Contrôle Final |
| 🏭 **Production** | `production` | `production` | Atelier |

> **Note** : Seul l'Administrateur peut modifier ses identifiants (depuis Paramètres).
> Les autres portails ont des identifiants fixes gérés par l'administration.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   RMASC FACTORY (Electron)                   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  Frontend    │    │   Backend    │    │  Base de       │  │
│  │  React 18    │───▶│  Express 4   │───▶│  Données       │  │
│  │  Vite 5      │    │  Prisma ORM  │    │  Neon          │  │
│  │  Tailwind    │    │  Zod Valid.  │    │  PostgreSQL    │  │
│  └─────────────┘    └──────┬───────┘    └────────────────┘  │
│                             │                                │
│                             ▼                                │
│                    ┌────────────────┐                        │
│                    │  PDF Fiche     │                        │
│                    │  Technique     │──▶ Bureau d'Étude #1   │
│                    │  (PDFKit)      │    192.168.0.189:30000 │
│                    └────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### Structure du Projet

```
C:/Users/HP/RMASC/
├── electron/
│   ├── main.cjs         # Processus principal Electron
│   ├── preload.cjs      # Pont d'API (contextBridge)
│   └── splash.cjs       # Écran de démarrage
├── src/                 # Frontend React
│   ├── components/      # Composants React
│   │   ├── Dashboard.tsx
│   │   ├── AddElevator.tsx
│   │   ├── BureauEtudeWorkspace.tsx
│   │   ├── ProductionWorkspace.tsx
│   │   ├── FicheTechniqueView.tsx
│   │   ├── LoginScreen.tsx
│   │   └── ...
│   └── data/
│       └── portalUsers.ts  # Gestion des comptes
├── backend/             # API Express
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── schemas/
│   └── .env
├── assets/              # Ressources (logo)
├── scripts/
│   ├── build.bat        # Script de build complet
│   ├── start.bat        # Lancement développement
│   └── start-prod.bat   # Lancement production
├── dist/renderer/       # Frontend compilé (généré)
├── package.json
└── README.md
```

---

## 🚀 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le frontend Vite seul |
| `npm run dev:electron` | Frontend + Electron (dev) |
| `npm run dev:full` | Backend + Frontend + Electron |
| `npm run build:renderer` | Compile le frontend |
| `npm run build:backend` | Compile le backend |
| `npm run build:full` | Build complet (renderer + backend + .exe) |
| `npm run build:installer` | Build + installateur NSIS |
| `scripts\build.bat` | Build production automatisé |
| `scripts\build.bat --installer` | Build + installateur |
| `scripts\start.bat` | Lancement rapide (dev) |
| `scripts\start-prod.bat` | Lancement depuis le build |

---

## 🗃️ Catalogue Mekisan Intégré

Le formulaire de création de commande intègre les standards du catalogue Mekisan :

- **Types de Cabine** : Passager, Panoramique, Monte-Charge, Service
- **Types de Portes** : Automatique Centrale, Télescopique, Battante
- **Finition Portes** : Inox Brossé, Miroir, Texturé, Vitré
- **Châssis** : Traction Électrique 2:1/1:1, Hydraulique Direct/Indirect
- **Finition Intérieure** : Inox Satiné, Bois Stratifié, Verre Décoratif, Prélaqué RAL
- **Revêtement Sol** : PVC Antidérapant, Granit Naturel, Inox Larmière
- **Spécifications Mécaniques** : Passage Libre, Hauteur Utile, Suspension, Surcharge

---

## 🔒 Sécurité

- Authentification par portail (identifiants dédiés par rôle)
- Sessions conservées en mémoire pendant l'exécution de l'application
- JWT pour les appels API
- Communication chiffrée avec Neon PostgreSQL (SSL)
- Isolation des contextes Electron (contextIsolation)

---

## 📄 Licence

Propriétaire — RMASC © 2026. Tous droits réservés.
