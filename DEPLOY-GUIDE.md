# 🚀 RMASC FACTORY ERP — Guide de Déploiement Professionnel

> Document de référence pour déployer les changements en production.
> Temps estimé : **3 minutes**

---

## 📋 À faire avant chaque déploiement

1. ❌ **Vérifier que le build passe** — `npm run build` doit finir sans erreur
2. ❌ **Commiter les changements** — `git status` doit montrer tes fichiers modifiés
3. ❌ **Serveur allumé** — `curl http://100.73.62.52:4000/api/health`

---

## ⚡ Méthode 1 : Déploiement Automatique via Git (RECOMMANDÉ)

> **Une fois configuré** : il suffit de `git push origin main` et tout se déploie tout seul via GitHub Actions.

### ✅ Si GitHub Actions est actif

```powershell
# 1. Aller dans le projet
cd C:\Users\stimanios\RMASC-ERP

# 2. Vérifier l'état
git status

# 3. Ajouter et commiter les changements
git add -A
git commit -m "Description de ce qui a changé"

# 4. Pousser sur GitHub → AUTOMATIQUE !
git push origin main
```

✅ **C'est fini.** GitHub Actions build, upload et redémarre le serveur tout seul.

### Voir le statut du déploiement

- **https://github.com/stimanios2025S/RMASC-ERP/actions**
- Un ✅ vert = déploiement réussi
- Un ❌ rouge = cliquer pour voir l'erreur

---

## 🛠️ Méthode 2 : Déploiement Manuel (PowerShell)

> Utilise cette méthode si GitHub Actions n'est pas encore configuré.

### Une seule commande

```powershell
cd C:\Users\stimanios\RMASC-ERP
.\deploy-rmasc.ps1
```

### Si tu veux juste vérifier l'état du serveur

```powershell
.\deploy-rmasc.ps1 -Status
```

### Si tu veux voir les logs

```powershell
.\deploy-rmasc.ps1 -Logs
```

---

## 🔧 Méthode 3 : Déploiement Manuel Pas à Pas (SI SCP ÉCHOUE)

> Utilise cette méthode si les scripts automatiques échouent.

### Étape 1 — Sur ton PC (PowerShell)

```powershell
cd C:\Users\stimanios\RMASC-ERP

# Build le frontend
npm run build

# Upload les fichiers (taper le mot de passe à chaque fois)
scp -r dist\* sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/dist/
scp backend\api.mjs sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/
scp backend\src\controllers\*.js sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/src/controllers/
scp backend\src\middleware\*.js sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/src/middleware/
scp backend\src\schemas\*.js sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/src/schemas/
scp backend\src\utils\*.js sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/src/utils/
scp backend\src\models\*.js sarlrmasc@100.73.62.52:/home/sarlrmasc/rmasc-erp/backend/src/models/
```

### Étape 2 — Sur le serveur (via PowerShell)

```powershell
ssh sarlrmasc@100.73.62.52
```

Dans la session SSH :

```bash
pm2 restart rmasc-api
curl http://localhost:4000/api/health
exit
```

---

## 🏗️ Architecture du serveur

```
Accès :  sarlrmasc@100.73.62.52
Projet : /home/sarlrmasc/rmasc-erp/
Dist   : /home/sarlrmasc/rmasc-erp/dist/  (frontend compilé)
Backend: /home/sarlrmasc/rmasc-erp/backend/api.mjs
PM2    : rmasc-api (process manager)
URL    : http://100.73.62.52:4000
```

---

## 🆘 En cas de problème

### Le serveur ne répond pas (`ERR_CONNECTION_REFUSED`)

```powershell
# Vérifier si PM2 tourne
ssh sarlrmasc@100.73.62.52 "pm2 status"

# Voir les logs d'erreur
ssh sarlrmasc@100.73.62.52 "pm2 logs rmasc-api --lines 20"
```

### Le serveur crash en boucle (↺ qui augmente)

```powershell
# Stopper, nettoyer, redémarrer
ssh sarlrmasc@100.73.62.52 "pm2 delete rmasc-api && pm2 kill && sleep 2 && pm2 start /home/sarlrmasc/rmasc-erp/ecosystem.config.cjs"
```

### Error "Authentification requise" dans l'ERP

```powershell
# Effacer le cache navigateur
# F12 → Application → Storage → Clear site data → F5
```

### Error "Cannot find module 'stats.js'"

```powershell
# Le fichier stats.js n'existe pas sur le serveur → re-uploader les controllers
# Utiliser la Méthode 2 ou 3
```

---

## 📌 Checklist avant de quitter

- [ ] `npm run build` passe sans erreur
- [ ] Les fichiers sont commités sur GitHub
- [ ] La plateforme répond : `http://100.73.62.52:4000`
- [ ] L'API répond : `curl .../api/health` → `{"status":"ok"}`

---

> **Document créé le 27/07/2026 — RMASC FACTORY ERP v2.6.0**
>
> ## 📊 Monitoring
>
> | Service | URL | Description |
> |---------|-----|-------------|
> | **Sentry** | https://sentry.io | Tracking d'erreurs en temps réel (login GitHub) |
> | **Site** | https://sarl-rmasc.com | ERP en production |
> | **IP directe** | http://100.73.62.52:4000 | Accès direct sans DNS |
