# 🚀 RMASC FACTORY — Instructions de Déploiement (Demain à l'usine)

## ✅ Préparation (à faire avant d'aller à l'usine)

```bash
# 1. Installer le package de rate limiting
cd backend && npm install express-rate-limit

# 2. Revenir à la racine
cd ..

# 3. Vérifier que TypeScript compile
npm run typecheck

# 4. Lancer les tests
npm run test

# 5. Vérifier la syntaxe du backend
node --check backend/api.mjs
```

Si une de ces vérifications échoue, **ne déploie pas** — corrige d'abord.

---

## 🔥 À L'USINE — Procédure de déploiement

### Étape 1 : Backup
```bash
# Sur le serveur de production (usine)
cd /chemin/vers/rmasc-app

# Sauvegarder la base MongoDB
mongodump --uri="mongodb://127.0.0.1:27017/rmasc-erp" --out=/tmp/rmasc-backup-$(date +%Y%m%d)

# Sauvegarder les uploads
cp -r uploads /tmp/uploads-backup-$(date +%Y%m%d)
```

### Étape 2 : Arrêter le service
```bash
# Arrêter le processus backend (PM2)
pm2 stop rmasc-backend

# Ou si c'est un service systemd
sudo systemctl stop rmasc-backend
```

### Étape 3 : Déployer les fichiers
```bash
# Depuis ta machine locale (préparée aujourd'hui)
# Option A : Git pull (si le repo est connecté)
git pull origin main

# Option B : Copie manuelle (si pas de Git)
# Copier tous les fichiers modifiés depuis ta clé USB / partage réseau
```

### Étape 4 : Installer les dépendances
```bash
# Backend
cd backend
npm install                         # Installe express-rate-limit
cd ..

# Frontend
npm install                         # Déjà fait, mais vérifie
npm run build                       # Rebuild le frontend
```

### Étape 5 : Démarrer
```bash
# Démarrer le backend
cd backend
pm2 start api.mjs --name rmasc-backend
# Ou : node api.mjs &

# Vérifier que ça tourne
curl http://localhost:4000/api/health
# → Doit renvoyer {"status":"ok","service":"RMASC ERP (MongoDB)","database":"connected",...}
```

### Étape 6 : Vérifier en production
```bash
# Tester depuis le serveur
curl https://sarl-rmasc.com/api/health

# Tester le login
curl -X POST https://sarl-rmasc.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"salim","password":"salim123"}'
```

---

## 📋 Checklist de vérification

| # | Vérification | OK ? |
|---|--------------|------|
| 1 | Backend démarre sans erreur | ☐ |
| 2 | MongoDB connecté (health check) | ☐ |
| 3 | Login fonctionne (token JWT reçu) | ☐ |
| 4 | Frontend chargé (https://sarl-rmasc.com) | ☐ |
| 5 | Commandes visibles dans le dashboard | ☐ |
| 6 | Upload de fichier fonctionne | ☐ |
| 7 | Mouvement de stock fonctionne | ☐ |
| 8 | Statut commande changeable | ☐ |

---

## ⚠️ En cas de problème

### "JWT_SECRET non défini"
```bash
# Ajouter dans backend/.env
echo 'JWT_SECRET="rmasc-jwt-production-secret-2026"' >> backend/.env
```

### "express-rate-limit not found"
```bash
cd backend && npm install express-rate-limit
```

### "MongoDB indisponible"
```bash
# Vérifier que MongoDB tourne
sudo systemctl status mongod
# Ou :
mongosh --eval "db.runCommand({ping:1})"
```

### "Port déjà utilisé"
```bash
# Changer le port dans backend/.env
echo 'PORT=4001' >> backend/.env
# Redémarrer
```
