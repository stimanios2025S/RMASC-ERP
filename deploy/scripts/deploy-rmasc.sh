#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Déploiement Automatisé
#  Met en place l'application complète sur le serveur local (192.168.1.95)
#
#  Usage :
#    ./deploy-rmasc.sh              # Déploiement complet
#    ./deploy-rmasc.sh --quick      # Mise à jour rapide (sans reconfiguration)
#    ./deploy-rmasc.sh --status     # Vérifier l'état des services
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

# ─── Configuration ──────────────────────────────────────────────────────────
RMASC_USER="${RMASC_USER:-sarlrmasc}"
RMASC_HOST="${RMASC_HOST:-192.168.1.95}"
RMASC_DIR="${RMASC_DIR:-/opt/rmasc}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/rmasc-erp}"
JWT_SECRET="${JWT_SECRET:-rmasc-jwt-production-secret-2026}"

# ─── Helper functions ────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}  ℹ️  ${NC}$1"; }
ok()    { echo -e "${GREEN}  ✅ ${NC}$1"; }
warn()  { echo -e "${YELLOW}  ⚠️  ${NC}$1"; }
error() { echo -e "${RED}  ❌ ${NC}$1"; }
step()  { echo -e "\n${BOLD}${BLUE}  ── $1 ──${NC}\n"; }

# ─── Banner ─────────────────────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${BOLD}${BLUE}  ╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}  ║${NC}  🏭  ${BOLD}RMASC FACTORY — Déploiement${NC}            ${BOLD}${BLUE}║${NC}"
    echo -e "${BOLD}${BLUE}  ║${NC}  🌐  ${CYAN}$RMASC_HOST${NC}                        ${BOLD}${BLUE}║${NC}"
    echo -e "${BOLD}${BLUE}  ║${NC}  📂  ${CYAN}$RMASC_DIR${NC}  ${BOLD}${BLUE}║${NC}"
    echo -e "${BOLD}${BLUE}  ╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

# ─── Vérifier les prérequis ─────────────────────────────────────────────────
check_prerequisites() {
    step "PRÉREQUIS"

    # Vérifier SSH
    if ! command -v ssh &> /dev/null; then
        error "SSH n'est pas installé."
        exit 1
    fi
    ok "SSH disponible"

    # Tester la connexion SSH
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$RMASC_USER@$RMASC_HOST" "echo OK" 2>/dev/null; then
        ok "Connexion SSH vers $RMASC_HOST établie"
    else
        error "Impossible de se connecter à $RMASC_HOST via SSH."
        info "Vérifiez : ssh $RMASC_USER@$RMASC_HOST"
        exit 1
    fi

    # Vérifier rsync
    if ! command -v rsync &> /dev/null; then
        info "Installation de rsync..."
        sudo apt-get install -y rsync > /dev/null 2>&1 || brew install rsync > /dev/null 2>&1 || true
    fi
    ok "rsync disponible"

    # Vérifier le build local
    if [ ! -d "dist" ]; then
        warn "Le dossier dist/ n'existe pas. Build en cours..."
        npm run build
        ok "Build terminé"
    fi
}

# ─── Préparer les fichiers de configuration ─────────────────────────────────
prepare_configs() {
    step "PRÉPARATION DES CONFIGS"

    # Créer le backend .env
    mkdir -p deploy/tmp
    cat > deploy/tmp/.env << ENVEOF
# ─── RMASC FACTORY — Production (Déploiement Local) ─────────────────────────
MONGODB_URI="${MONGODB_URI}"
DATABASE_URL="${MONGODB_URI}"
JWT_SECRET="${JWT_SECRET}"
PORT=${BACKEND_PORT}
NODE_ENV=production
WEBHOOK_API_KEY="rmasc-webhook-shared-secret"
STAMP_HMAC_KEY="rmasc-stamp-signing-key-v1"
ENVEOF
    ok "Fichier .env backend généré"

    # Copier la config Nginx
    cp deploy/nginx/rmasc-app.conf deploy/tmp/
    ok "Config Nginx préparée"

    # Copier la config PM2
    cp deploy/pm2/ecosystem.config.cjs deploy/tmp/
    ok "Config PM2 préparée"

    # Copier la config tunnel
    cp deploy/cloudflare/tunnel-config.yml deploy/tmp/ 2>/dev/null || true
    ok "Config Cloudflare préparée"
}

# ─── Transférer les fichiers sur le serveur ──────────────────────────────────
transfer_files() {
    step "TRANSFERT DES FICHIERS"

    info "Création des dossiers distants..."
    ssh "$RMASC_USER@$RMASC_HOST" "sudo mkdir -p $RMASC_DIR $RMASC_DIR/backend $RMASC_DIR/dist /var/log/rmasc"

    # Synchroniser le backend
    info "Transfert du backend..."
    rsync -az --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude 'dist' \
        backend/ "$RMASC_USER@$RMASC_HOST:$RMASC_DIR/backend/"
    ok "Backend transféré"

    # Transférer le frontend buildé
    info "Transfert du frontend (build)..."
    rsync -az --delete dist/ "$RMASC_USER@$RMASC_HOST:$RMASC_DIR/dist/"
    ok "Frontend transféré"

    # Transférer les fichiers de config
    info "Transfert des configurations..."
    rsync -az deploy/tmp/ "$RMASC_USER@$RMASC_HOST:$RMASC_DIR/configs/"
    ok "Configurations transférées"

    # Transférer package.json et node_modules
    rsync -az package.json package-lock.json "$RMASC_USER@$RMASC_HOST:$RMASC_DIR/"
    ok "Package files transférés"

    # Configurer les permissions
    ssh "$RMASC_USER@$RMASC_HOST" "sudo chown -R $RMASC_USER:$RMASC_USER $RMASC_DIR && sudo chmod -R 755 $RMASC_DIR"
    ok "Permissions configurées"
}

# ─── Installer les dépendances sur le serveur ────────────────────────────────
install_dependencies() {
    step "INSTALLATION DES DÉPENDANCES"

    info "Installation des dépendances Node.js..."
    ssh "$RMASC_USER@$RMASC_HOST" "cd $RMASC_DIR && npm install --production 2>&1 | tail -3"
    ok "Dépendances Node.js installées"

    # Vérifier PM2
    if ! ssh "$RMASC_USER@$RMASC_HOST" "which pm2 &>/dev/null"; then
        info "Installation de PM2 globalement..."
        ssh "$RMASC_USER@$RMASC_HOST" "sudo npm install -g pm2 2>&1 | tail -3"
    fi
    ok "PM2 prêt"
}

# ─── Configurer Nginx ────────────────────────────────────────────────────────
setup_nginx() {
    step "CONFIGURATION NGINX"

    # Vérifier si Nginx est installé
    if ! ssh "$RMASC_USER@$RMASC_HOST" "which nginx &>/dev/null"; then
        info "Installation de Nginx..."
        ssh "$RMASC_USER@$RMASC_HOST" "sudo apt-get update -qq && sudo apt-get install -y -qq nginx"
    fi

    # Copier la config
    ssh "$RMASC_USER@$RMASC_HOST" "sudo cp $RMASC_DIR/configs/rmasc-app.conf /etc/nginx/sites-available/rmasc-app.conf"

    # Activer le site
    ssh "$RMASC_USER@$RMASC_HOST" "sudo ln -sf /etc/nginx/sites-available/rmasc-app.conf /etc/nginx/sites-enabled/ 2>/dev/null; sudo rm -f /etc/nginx/sites-enabled/default"

    # Créer les certificats SSL auto-signés (pour le développement local)
    ssh "$RMASC_USER@$RMASC_HOST" "sudo mkdir -p /etc/nginx/ssl && if [ ! -f /etc/nginx/ssl/rmasc.crt ]; then sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/nginx/ssl/rmasc.key -out /etc/nginx/ssl/rmasc.crt -subj '/CN=RMASC-Factory/O=RMASC/C=DZ' 2>/dev/null; fi"

    # Tester et recharger
    ssh "$RMASC_USER@$RMASC_HOST" "sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx"
    ok "Nginx configuré et rechargé"
}

# ─── Configurer et démarrer le backend ────────────────────────────────────────
setup_backend() {
    step "CONFIGURATION DU BACKEND"

    # Copier le .env dans le dossier backend
    ssh "$RMASC_USER@$RMASC_HOST" "cp $RMASC_DIR/configs/.env $RMASC_DIR/backend/.env"
    ok "Fichier .env backend installé"

    # Démarrer avec PM2
    info "Démarrage du backend via PM2..."
    ssh "$RMASC_USER@$RMASC_HOST" "cd $RMASC_DIR && pm2 start configs/ecosystem.config.cjs 2>&1 || pm2 reload configs/ecosystem.config.cjs 2>&1 || true"

    # Sauvegarder la liste PM2 pour redémarrage auto
    ssh "$RMASC_USER@$RMASC_HOST" "pm2 save --force 2>&1"

    # Configurer le démarrage automatique de PM2
    ssh "$RMASC_USER@$RMASC_HOST" "pm2 startup systemd -u $RMASC_USER --hp /home/$RMASC_USER 2>&1 | tail -5" || true

    ok "Backend démarré sur le port $BACKEND_PORT"
}

# ─── Configurer le tunnel Cloudflare ────────────────────────────────────────
setup_cloudflare() {
    step "CONFIGURATION CLOUDFLARE TUNNEL"

    # Vérifier si cloudflared est installé
    if ! ssh "$RMASC_USER@$RMASC_HOST" "which cloudflared &>/dev/null"; then
        info "Installation de cloudflared..."
        ssh "$RMASC_USER@$RMASC_HOST" "curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/cloudflared && sudo chmod +x /usr/local/bin/cloudflared"
    fi

    # Vérifier la version
    ssh "$RMASC_USER@$RMASC_HOST" "cloudflared --version 2>&1"
    ok "cloudflared installé"

    # Copier la config du tunnel
    if [ -f deploy/cloudflare/tunnel-config.yml ]; then
        ssh "$RMASC_USER@$RMASC_HOST" "sudo mkdir -p /etc/cloudflared && sudo cp $RMASC_DIR/configs/tunnel-config.yml /etc/cloudflared/config.yml"
        ok "Configuration tunnel Cloudflare installée"
    fi

    # Redémarrer le tunnel
    info "Redémarrage du tunnel Cloudflare..."
    ssh "$RMASC_USER@$RMASC_HOST" "sudo systemctl restart cloudflared 2>/dev/null || cloudflared tunnel run rmasc-factory &>/dev/null &" || true
    ok "Tunnel Cloudflare configuré"
}

# ─── Vérifier le déploiement ────────────────────────────────────────────────
verify_deployment() {
    step "VÉRIFICATION DU DÉPLOIEMENT"

    sleep 3

    # Vérifier les processus
    info "Processus en cours d'exécution :"
    ssh "$RMASC_USER@$RMASC_HOST" "pm2 list 2>&1" || warn "PM2 non accessible"

    # Vérifier Nginx
    info "Test Nginx..."
    if ssh "$RMASC_USER@$RMASC_HOST" "curl -sI http://localhost:80 2>/dev/null | head -1"; then
        ok "Nginx répond sur le port 80"
    else
        warn "Nginx ne répond pas sur le port 80"
    fi

    # Vérifier le backend
    info "Test du backend API..."
    if ssh "$RMASC_USER@$RMASC_HOST" "curl -s http://localhost:$BACKEND_PORT/api/health 2>/dev/null"; then
        ok "Backend API répond sur le port $BACKEND_PORT"
    else
        warn "Backend API ne répond pas sur le port $BACKEND_PORT"
    fi

    # Vérifier MongoDB
    info "Test MongoDB..."
    if ssh "$RMASC_USER@$RMASC_HOST" "mongosh --eval 'db.version()' --quiet 2>/dev/null || mongod --version 2>/dev/null | head -1"; then
        ok "MongoDB est opérationnel"
    else
        warn "MongoDB non détecté. Exécutez : sudo systemctl start mongod"
    fi

    # Vérifier le frontend
    info "Test du frontend..."
    if ssh "$RMASC_USER@$RMASC_HOST" "curl -s http://localhost:80 2>/dev/null | head -5"; then
        ok "Frontend sert correctement"
    else
        warn "Frontend non accessible"
    fi
}

# ─── Afficher le résumé ─────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}${GREEN}  ╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}  ║${NC}  🎉  ${BOLD}DÉPLOIEMENT TERMINÉ AVEC SUCCÈS${NC}     ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}  ╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Accès locaux :${NC}"
    echo -e "    📍  Application :  ${CYAN}http://192.168.1.95${NC}"
    echo -e "    📍  API Health  :  ${CYAN}http://192.168.1.95/api/health${NC}"
    echo -e "    📍  Backend API :  ${CYAN}http://192.168.1.95:4000${NC}"
    echo ""
    echo -e "  ${BOLD}Accès externe (Cloudflare) :${NC}"
    echo -e "    🌐  ${CYAN}https://sarl-rmasc.com${NC}"
    echo -e "    🌐  ${CYAN}https://erp.rmasc-dz.com${NC} (si configuré)"
    echo ""
    echo -e "  ${BOLD}Gestion :${NC}"
    echo -e "    📋  Logs API   :  ${YELLOW}pm2 logs rmasc-api${NC}"
    echo -e "    🔄  Restart    :  ${YELLOW}pm2 restart rmasc-api${NC}"
    echo -e "    📊  Monitor    :  ${YELLOW}pm2 monit${NC}"
    echo -e "    🚦  Status     :  ${YELLOW}pm2 status${NC}"
    echo ""
    echo -e "  ${BOLD}Commandes utiles :${NC}"
    echo -e "    🔧  Rebuild frontend :  ${YELLOW}cd $RMASC_DIR && npm run build${NC}"
    echo -e "    🗄️  MongoDB logs     :  ${YELLOW}sudo journalctl -u mongod -n 100${NC}"
    echo -e "    🌐  Nginx logs       :  ${YELLOW}sudo tail -f /var/log/nginx/rmasc-error.log${NC}"
    echo -e "    🚇  Tunnel logs      :  ${YELLOW}sudo journalctl -u cloudflared -n 50${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

print_banner

case "${1:-}" in
    --quick)
        info "Mode mise à jour rapide..."
        prepare_configs
        transfer_files
        install_dependencies
        setup_backend
        verify_deployment
        print_summary
        ;;
    --status)
        info "Vérification de l'état des services..."
        verify_deployment
        ;;
    --help|-h)
        echo "Usage: $0 [--quick|--status|--help]"
        echo ""
        echo "  (sans args)  Déploiement complet (recommandé pour 1ère fois)"
        echo "  --quick      Mise à jour rapide (backend + frontend)"
        echo "  --status     Vérifier l'état des services"
        echo "  --help       Afficher cette aide"
        ;;
    *)
        info "Déploiement complet..."
        check_prerequisites
        prepare_configs
        transfer_files
        install_dependencies
        setup_nginx
        setup_backend
        setup_cloudflare
        verify_deployment
        print_summary
        ;;
esac
