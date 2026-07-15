#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RMASC FACTORY — Quick Update Script (to run on the server)
#  Use this when you upload new files or make small changes
#  Usage:
#    ./quick-update.sh            # Rebuild + restart everything
#    ./quick-update.sh frontend   # Just reload Nginx (after dist/ upload)
#    ./quick-update.sh backend    # Restart PM2 (after backend changes)
#    ./quick-update.sh status     # Check everything
# ═══════════════════════════════════════════════════════════════════════════════

set -e
RMASC_DIR="/opt/rmasc"

case "${1:-all}" in
    frontend)
        echo "  🔄 Reloading frontend (Nginx)..."
        sudo nginx -t && sudo systemctl reload nginx
        echo "  ✅ Frontend reloaded"
        ;;
    backend)
        echo "  🔄 Restarting backend (PM2)..."
        cd "$RMASC_DIR"
        pm2 restart rmasc-backend 2>/dev/null || pm2 start deploy/pm2/ecosystem.config.cjs
        echo "  ✅ Backend restarted"
        ;;
    status)
        echo ""
        echo "  ╔══════════════════════════════════════════════╗"
        echo "  ║    RMASC — Status                           ║"
        echo "  ╚══════════════════════════════════════════════╝"
        echo ""
        echo "  📊 PM2 Processes:"
        pm2 list
        echo ""
        echo "  🌐 Nginx:"
        sudo systemctl status nginx --no-pager -l | head -3
        echo ""
        echo "  🚇 Cloudflare Tunnel:"
        sudo systemctl status cloudflared --no-pager -l | head -3
        echo ""
        echo "  🗄️  MongoDB:"
        sudo systemctl status mongod --no-pager -l | head -3 2>/dev/null || echo "  mongod not running"
        echo ""
        echo "  🩺 Health Check:"
        curl -s http://localhost:80/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:80/api/health
        echo ""
        echo "  📍 http://192.168.1.95"
        echo "  🌐 https://sarl-rmasc.com"
        ;;
    all)
        echo "  🔄 Full update..."
        cd "$RMASC_DIR"

        # Reload frontend
        echo "  [1/3] Reloading Nginx..."
        sudo nginx -t && sudo systemctl reload nginx

        # Restart backend
        echo "  [2/3] Restarting backend..."
        pm2 restart rmasc-backend 2>/dev/null || pm2 start deploy/pm2/ecosystem.config.cjs

        # Verify
        echo "  [3/3] Verifying..."
        sleep 2
        echo "  ✅ Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:80)"
        echo "  ✅ API:      $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/health)"
        echo "  ✅ Done!"
        ;;
    *)
        echo "Usage: $0 {frontend|backend|status|all}"
        exit 1
        ;;
esac
