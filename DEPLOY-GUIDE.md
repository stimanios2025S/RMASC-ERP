# 🚀 RMASC FACTORY ERP — Guide de Déploiement

> **Nom PM2 :** `rmasc-erp`  
> **Dossier projet :** `/home/sarlrmasc/rmasc-erp`  
> **Dépôt GitHub :** `stimanios2025S/RMASC-ERP`  
> **Temps estimé :** 2 minutes

---

## ⚡ Déploiement Rapide (SSH)

Dans **PowerShell** sur ton PC :

```powershell
# 1. Build le frontend
cd C:\Users\stimanios\RMASC-ERP
npm run build

# 2. Connexion au serveur
ssh sarlrmasc@100.73.62.52
```

**Une fois connecté (SSH),** copie/colle ça :

```bash
cd /home/sarlrmasc/rmasc-erp && \
git reset --hard && \
git pull origin main && \
npm ci && \
npm run build && \
pm2 restart rmasc-erp --update-env && \
curl http://localhost:4000/api/health
```

✅ **Fini.** Vérifie que le dernier `curl` renvoie `{"status":"ok"}`.

---

## 📋 Autres commandes utiles (sur le serveur)

```bash
pm2 status              # Voir si rmasc-erp tourne
pm2 logs rmasc-erp      # Voir les logs en direct
pm2 restart rmasc-erp   # Redémarrer le backend
pm2 stop rmasc-erp      # Arrêter le backend
pm2 monit              # Surveiller CPU/RAM
```

---

## 🐛 En cas de problème

### Le backend ne répond pas
```bash
pm2 logs rmasc-erp --lines 30
```

### MongoDB ne répond pas
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```

### Erreur "port already in use"
```bash
# Trouver le processus sur le port 4000
lsof -i :4000
kill -9 <PID>
pm2 restart rmasc-erp
```
