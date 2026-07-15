# 🌐 RMASC FACTORY — Connexion du Domaine Squarespace

> **Guide complet** pour connecter votre domaine `erp.rmasc-dz.com` (acheté sur Squarespace) à votre serveur HP ProLiant DL360.

---

## 📋 Étape 1 : Obtenir votre adresse IP publique

Sur votre serveur HP ProLiant, exécutez :

```bash
curl -s https://api.ipify.org
```

Notez l'adresse IP affichée (ex: `196.12.34.56`). C'est l'adresse que vous allez lier à votre domaine.

---

## 📋 Étape 2 : Configurer les DNS dans Squarespace

1. **Connectez-vous** à [Squarespace Domains](https://domains.squarespace.com)
2. Cliquez sur votre domaine **`erp.rmasc-dz.com`**
3. Allez dans l'onglet **DNS Settings** (Paramètres DNS)

### 🔴 Supprimer les enregistrements par défaut

Squarespace ajoute automatiquement des enregistrements par défaut. Supprimez-les :
- Cliquez sur les 3 points `⋮` à droite de chaque enregistrement
- Sélectionnez **Delete**
- Ne gardez PAS les enregistrements Squarespace par défaut

### 🟢 Ajouter les enregistrements DNS requis

Cliquez sur **Add Record** et ajoutez ceci **exactement** :

| Type | Name/Host | Value/Points to | TTL |
|------|-----------|----------------|-----|
| **A** | `@` (ou laisser vide) | `<VOTRE_IP_PUBLIQUE>` | 600 |
| **A** | `www` | `<VOTRE_IP_PUBLIQUE>` | 600 |

> **Remplacez** `<VOTRE_IP_PUBLIQUE>` par l'adresse IP obtenue à l'étape 1.

### 📧 Optionnel : Emails professionnels

Si vous voulez des emails comme `contact@rmasc-dz.com` (via Google Workspace) :

| Type | Name | Value | Priority |
|------|------|-------|----------|
| **MX** | `@` | `ASPMX.L.GOOGLE.COM` | 1 |
| **MX** | `@` | `ALT1.ASPMX.L.GOOGLE.COM` | 5 |
| **MX** | `@` | `ALT2.ASPMX.L.GOOGLE.COM` | 5 |
| **MX** | `@` | `ALT3.ASPMX.L.GOOGLE.COM` | 10 |
| **MX** | `@` | `ALT4.ASPMX.L.GOOGLE.COM` | 10 |
| **TXT** | `@` | `v=spf1 include:_spf.google.com ~all` | — |

### 💾 Enregistrer

Cliquez sur **Save** ou **Apply**. La propagation DNS prend **5 à 30 minutes**.

---

## 📋 Étape 3 : Vérifier la propagation DNS

Depuis votre serveur ou n'importe quel ordinateur :

```bash
# Vérifier que le domaine pointe vers votre serveur
ping erp.rmasc-dz.com
nslookup erp.rmasc-dz.com
```

L'adresse IP affichée doit correspondre à celle de votre serveur HP ProLiant.

---

## 📋 Étape 4 : Lancer le déploiement

Une fois le DNS propagé, connectez-vous à votre serveur et exécutez :

```bash
cd /opt/rmasc-core
sudo bash deploy-domain.sh
```

Ce script va :
1. ✅ Builder le frontend React
2. ✅ Configurer Nginx avec votre domaine
3. ✅ Obtenir un certificat SSL (Let's Encrypt) — **gratuit et sécurisé**
4. ✅ Activer HTTPS (cadenas vert)
5. ✅ Afficher le statut final

---

## 🔄 Renouvellement SSL automatique

Le certificat Let's Encrypt se renouvelle automatiquement tous les 90 jours.
Pour vérifier :

```bash
sudo certbot renew --dry-run
```

---

## 🔧 Problèmes fréquents

### ❌ "DNS ne pointe pas vers ce serveur"

Attendez 30 minutes (propagation DNS). Puis relancez :
```bash
sudo certbot --nginx -d erp.rmasc-dz.com -d www.ermasc-dz.com
```

### ❌ "Erreur 502 Bad Gateway"

Le backend Express ne tourne pas. Vérifiez :
```bash
pm2 status
# Si arrêté : cd /opt/rmasc-core && npm start
```

### ❌ "Page blanche"

Le build frontend peut être corrompu. Re-déployez :
```bash
cd /opt/rmasc-core && npx vite build
```

---

## ✅ Résultat final

```
https://erp.rmasc-dz.com
         │
         ▼
   🌐 Nginx (port 443, HTTPS)
         │
         ├── 📄 Frontend statique (dist/)  ← React
         │
         └── 🔄 Proxy /api/
                 │
                 ▼
           🚀 Express (port 4000)
                 │
                 ▼
           🍃 MongoDB (port 27017, loopback)
```

---
*RMASC FACTORY — Progiciel de Gestion Intégré pour Ascenseurs*
