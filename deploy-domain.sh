#!/usr/bin/env bash
#===============================================================================
# RMASC FACTORY — DOMAIN DEPLOYMENT SCRIPT
# Connecte l'application au domaine erp.rmasc-dz.com (Squarespace)
#===============================================================================
# Prérequis :
#   1. Avoir acheté le domaine sur Squarespace
#   2. Avoir configuré les enregistrements DNS (voir README-DOMAIN.md)
#   3. Avoir installé Node.js, PM2 et Nginx (fait par deploy-rmasc-core.sh)
#===============================================================================
set -euo pipefail
IFS=$'\n\t'

# ─── Couleurs ─────────────────────────────────────────────────────────────
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'
log_info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_section() { echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $*${NC}"; echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}\n"; }

# ─── Vérification root ────────────────────────────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
    log_error "Exécutez avec : sudo ./deploy-domain.sh"
    exit 1
fi

# ─── Configuration ────────────────────────────────────────────────────────
readonly DOMAIN="erp.rmasc-dz.com"
readonly ADMIN_EMAIL="admin@rmasc-dz.com"
readonly APP_ROOT="/opt/rmasc-core"
readonly FRONTEND_DIR="/opt/rmasc-core/frontend"
readonly BACKEND_DIR="/opt/rmasc-core/backend"
readonly NGINX_SITE="rmasc-erp"
readonly PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

log_section "RMASC FACTORY — Déploiement Professionnel du Domaine"
echo ""
echo "  Domaine : ${BOLD}${CYAN}${DOMAIN}${NC}"
echo "  Serveur : HP ProLiant DL360 Gen9"
echo "  Projet  : ${PROJECT_DIR}"
echo ""

# ─── Étape 1 : Build du frontend Vite ───────────────────────────────────
log_section "ÉTAPE 1 : Build du Frontend (Vite + React)"

log_info "Nettoyage du build précédent..."
rm -rf "${PROJECT_DIR}/dist"

log_info "Build de l'application en mode production..."
cd "${PROJECT_DIR}"

# Copier .env.production si .env n'existe pas
if [[ ! -f .env ]]; then
    cp .env.production .env 2>/dev/null || true
    log_info "Fichier .env créé depuis .env.production"
fi

npx vite build 2>&1 | tail -5

if [[ ! -d "${PROJECT_DIR}/dist" ]]; then
    log_error "Le build a échoué. Vérifiez les erreurs ci-dessus."
    exit 1
fi
log_info "✅ Build terminé !"

# ─── Étape 2 : Copier les fichiers dans le répertoire de production ──────
log_section "ÉTAPE 2 : Installation des fichiers de production"

mkdir -p "${FRONTEND_DIR}"
cp -r "${PROJECT_DIR}/dist/"* "${FRONTEND_DIR}/"
log_info "✅ Frontend copié vers ${FRONTEND_DIR}"

# ─── Étape 3 : Configuration Nginx définitive ──────────────────────────
log_section "ÉTAPE 3 : Configuration Nginx avec le domaine"

# Sauvegarder l'ancienne config si elle existe
if [[ -f "/etc/nginx/sites-available/${NGINX_SITE}" ]]; then
    cp "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-available/${NGINX_SITE}.bak.$(date +%Y%m%d%H%M%S)"
    log_info "Ancienne configuration sauvegardée"
fi

cat > "/etc/nginx/sites-available/${NGINX_SITE}" <<NGINX_EOF
# =============================================================================
# NGINX PRODUCTION — RMASC FACTORY | ${DOMAIN}
# =============================================================================
# Ce fichier est la configuration FINALE de production.
# Il sert le frontend React statique depuis le disque et proxy
# les appels API vers le backend PM2 (port 3000 interne).
# =============================================================================

# ─── Redirection HTTP → HTTPS ─────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type text/plain;
        allow all;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ─── HTTPS — Production ──────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # ── Certificats SSL (Let's Encrypt) ────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Performance TLS ────────────────────────────────────────────────
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # ── Security Headers ───────────────────────────────────────────────
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # ── Upload capacity (CAD files) ───────────────────────────────────
    client_max_body_size 150M;
    client_body_buffer_size 256k;
    client_body_timeout 300s;
    client_header_timeout 60s;

    # ── Gzip compression ──────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types application/json application/javascript text/javascript text/css text/plain text/xml application/xml image/svg+xml;
    gzip_disable "msie6";

    # ── Frontend statique (SPA React) ──────────────────────────────────
    root ${FRONTEND_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # ── API Proxy vers le backend Express ─────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # ── Uploads fichiers ──────────────────────────────────────────────
    location /uploads/ {
        alias ${APP_ROOT}/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ── Static assets avec cache ──────────────────────────────────────
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ── Health check ──────────────────────────────────────────────────
    location /nginx-health {
        access_log off;
        return 200 "RMASC NGINX — ALIVE\n";
        add_header Content-Type text/plain;
    }

    # ── Sécurité : cacher les fichiers sensibles ──────────────────────
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    # ── Logs ──────────────────────────────────────────────────────────
    access_log /var/log/nginx/${DOMAIN}-access.log;
    error_log  /var/log/nginx/${DOMAIN}-error.log;
}
NGINX_EOF

log_info "✅ Configuration Nginx créée pour ${DOMAIN}"

# ─── Étape 4 : Obtenir le certificat SSL Let's Encrypt ─────────────────
log_section "ÉTAPE 4 : Certificat SSL Let's Encrypt"

# Vérifier que le DNS pointe bien vers ce serveur
log_info "Vérification de la résolution DNS pour ${DOMAIN}..."
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "unknown")
DOMAIN_IP=$(dig +short "${DOMAIN}" 2>/dev/null || host "${DOMAIN}" 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")

log_info "  IP publique du serveur : ${PUBLIC_IP}"
log_info "  IP du domaine ${DOMAIN} : ${DOMAIN_IP}"

if [[ -n "${PUBLIC_IP}" && -n "${DOMAIN_IP}" && "${PUBLIC_IP}" == "${DOMAIN_IP}" ]]; then
    log_info "✅ DNS correct — ${DOMAIN} pointe vers ce serveur."

    # Activer la configuration Nginx (temporairement en HTTP pour Certbot)
    ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
    nginx -t && systemctl reload nginx

    # Obtenir le certificat
    certbot --non-interactive --agree-tos \
        --email "${ADMIN_EMAIL}" \
        --nginx \
        --redirect \
        --domains "${DOMAIN}" \
        --domains "www.${DOMAIN}" \
        --no-eff-email \
        2>&1 || log_warn "Certbot a échoué. Exécutez manuellement : sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

    log_info "✅ Certificat SSL obtenu pour ${DOMAIN}"
else
    log_warn "⚠️  DNS pas encore propagé pour ${DOMAIN}."
    log_warn "   IP publique: ${PUBLIC_IP}"
    log_warn "   IP domaine:  ${DOMAIN_IP}"
    log_warn ""
    log_warn "   🔧 Action requise :"
    log_warn "   1. Allez sur https://domains.squarespace.com → DNS Settings"
    log_warn "   2. AJOUTEZ un enregistrement A :"
    log_warn "        @  →  ${PUBLIC_IP}"
    log_warn "        www →  ${PUBLIC_IP}"
    log_warn "   3. Attendez 5-30 minutes (propagation DNS)"
    log_warn "   4. Relancez ce script : sudo ./deploy-domain.sh"
    log_warn "   5. OU exécutez manuellement :"
    log_warn "      sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
    echo ""
fi

# ─── Étape 5 : Activer la configuration Nginx et recharger ──────────────
log_section "ÉTAPE 5 : Activation de la configuration Nginx"

ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"

log_info "Test de la configuration Nginx..."
nginx -t

log_info "Rechargement de Nginx..."
systemctl reload nginx || systemctl restart nginx

# ─── Étape 6 : Vérifier que le backend tourne sur le bon port ──────────
log_section "ÉTAPE 6 : Vérification du Backend"

if pm2 list 2>/dev/null | grep -q 'rmasc-erp'; then
    log_info "✅ PM2 cluster actif"
else
    log_warn "⚠️  Le cluster PM2 n'est pas démarré."
    log_warn "   Démarrez-le : cd ${PROJECT_DIR} && npm start"
fi

# Vérifier que le backend écoute sur le port 4000
if ss -tlnp 2>/dev/null | grep -q ':4000'; then
    log_info "✅ Backend actif sur le port 4000"
else
    log_warn "⚠️  Backend non détecté sur le port 4000"
    log_warn "   Démarrez-le : cd ${PROJECT_DIR}/backend && node api.mjs"
fi

# ─── Étape 7 : Vérification finale ────────────────────────────────────
log_section "ÉTAPE 7 : Vérification Finale"

echo ""
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║         RMASC FACTORY — DÉPLOIEMENT TERMINÉ                  ║"
echo "  ╠══════════════════════════════════════════════════════════════╣"
printf "  ║  %-13s: %-46s║\n" "Domaine" "https://${DOMAIN}"
printf "  ║  %-13s: %-46s║\n" "Frontend" "${FRONTEND_DIR}"
printf "  ║  %-13s: %-46s║\n" "Backend API" "http://127.0.0.1:4000/api/health"
printf "  ║  %-13s: %-46s║\n" "Nginx" "$(nginx -v 2>&1 | awk -F/ '{print $2}')"
printf "  ║  %-13s: %-46s║\n" "Certificat SSL" "$( [[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]] && echo 'Let\'s Encrypt ✓' || echo 'En attente...' )"
printf "  ║  %-13s: %-46s║\n" "Node.js" "$(node --version 2>/dev/null || echo 'N/A')"
echo "  ║                                                            ║"
echo "  ╠══════════════════════════════════════════════════════════════╣"
echo "  ║  PROCHAINES ÉTAPES :                                       ║"
echo "  ╠══════════════════════════════════════════════════════════════╣"
echo "  ║                                                            ║"
echo "  ║  1. Testez votre site : https://${DOMAIN}        ║"
echo "  ║                                                            ║"
echo "  ║  2. Dans Squarespace Domains, vérifiez :                   ║"
echo "  ║     - L'enregistrement A pointe vers votre IP publique     ║"
echo "  ║     - SSL est actif (cadenas vert dans le navigateur)      ║"
echo "  ║                                                            ║"
echo "  ║  3. Pour les emails professionnels :                       ║"
echo "  ║     Configurer Google Workspace ou tout autre service      ║"
echo "  ║     avec les enregistrements MX dans Squarespace DNS       ║"
echo "  ║                                                            ║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info "✅ Déploiement terminé ! Votre ERP est en ligne sur https://${DOMAIN}"

exit 0
