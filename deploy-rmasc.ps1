<#
╔══════════════════════════════════════════════════════════════════════════════╗
║  RMASC FACTORY — Quick Deploy PowerShell Script                            ║
║  Server : 192.168.1.95 (rmasc-local)                                       ║
║  Usage  : .\deploy-rmasc.ps1                                               ║
║           .\deploy-rmasc.ps1 -Quick     (skip build, just upload + reload) ║
║           .\deploy-rmasc.ps1 -Backend   (upload backend changes + restart) ║
║           .\deploy-rmasc.ps1 -Status    (check all services)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
#>

param(
    [switch]$Quick,
    [switch]$Backend,
    [switch]$Status
)

$SERVER = "sarlrmasc@192.168.1.95"
$APP_DIR = "/opt/rmasc"

function Write-Title { Write-Host "`n  $($args[0])" -ForegroundColor Cyan }
function Write-OK    { Write-Host "  ✅ $($args[0])" -ForegroundColor Green }
function Write-Error { Write-Host "  ❌ $($args[0])" -ForegroundColor Red }

Clear-Host
Write-Host "`n  ╔══════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║    RMASC FACTORY — Quick Deploy              ║" -ForegroundColor Blue
Write-Host "  ║    Server : 192.168.1.95                     ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Blue

if ($Status) {
    Write-Title "CHECKING SERVICES STATUS..."
    ssh $SERVER "pm2 list && echo '---' && sudo systemctl status nginx --no-pager -l | head -3 && echo '---' && sudo systemctl status cloudflared --no-pager -l | head -3 && echo '---' && curl -s http://localhost:80/api/health"
    exit
}

# ─── BUILD ────────────────────────────────────────────────────────────────
if (-not $Quick) {
    Write-Title "[1/3] BUILDING FRONTEND..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"; exit 1
    }
    Write-OK "Frontend built"
} else {
    Write-Title "[1/3] SKIPPING BUILD (--Quick mode)..."
}

# ─── UPLOAD ──────────────────────────────────────────────────────────────
Write-Title "[2/3] UPLOADING TO SERVER..."

if (-not $Backend) {
    Write-Host "  → Cleaning & uploading dist/..."
    ssh $SERVER "sudo rm -rf $APP_DIR/dist/*"
    scp -r "dist/*" "${SERVER}:${APP_DIR}/dist/"
    Write-OK "Frontend uploaded"
}

if ($Backend -or $Quick) {
    Write-Host "  → Uploading backend changes..."
    ssh $SERVER "mkdir -p $APP_DIR/backend/src/lib $APP_DIR/backend/src/models $APP_DIR/backend/src/middleware $APP_DIR/backend/src/controllers $APP_DIR/backend/src/schemas $APP_DIR/backend/src/utils"
    scp "backend/api.mjs" "${SERVER}:${APP_DIR}/backend/api.mjs"
    scp backend/src/lib/*.mjs "${SERVER}:${APP_DIR}/backend/src/lib/"
    scp backend/src/models/*.js "${SERVER}:${APP_DIR}/backend/src/models/"
    scp backend/src/controllers/*.js "${SERVER}:${APP_DIR}/backend/src/controllers/"
    scp backend/src/middleware/*.js "${SERVER}:${APP_DIR}/backend/src/middleware/"
    scp backend/src/schemas/*.js "${SERVER}:${APP_DIR}/backend/src/schemas/"
    scp backend/src/utils/*.js "${SERVER}:${APP_DIR}/backend/src/utils/"
    Write-OK "Backend uploaded"
}

# ─── RELOAD ──────────────────────────────────────────────────────────────
Write-Title "[3/3] RELOADING SERVICES..."
ssh $SERVER "pm2 restart rmasc-backend 2>/dev/null || pm2 start $APP_DIR/deploy/pm2/ecosystem.config.cjs"
ssh $SERVER "sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx"
Write-OK "Services reloaded"

# ─── VERIFY ──────────────────────────────────────────────────────────────
Start-Sleep -Seconds 2
$health = ssh $SERVER "curl -s http://localhost:80/api/health 2>/dev/null || echo 'FAIL'"
$fe = ssh $SERVER "curl -s http://localhost:80 2>/dev/null | head -1 || echo 'FAIL'"

Write-Host "`n  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║    🎉 DEPLOY COMPLETE !                      ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Local   :  http://192.168.1.95              ║" -ForegroundColor White
Write-Host "  ║  Externe :  https://sarl-rmasc.com           ║" -ForegroundColor White
Write-Host "  ║  API     :  $($health.Substring(0, [Math]::Min(40, $health.Length)))...  ║" -ForegroundColor White
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n  Quick commands:" -ForegroundColor Yellow
Write-Host "  .\deploy-rmasc.ps1           → Full deploy (build + upload + reload)"
Write-Host "  .\deploy-rmasc.ps1 -Backend  → Backend only (after small changes)"
Write-Host "  .\deploy-rmasc.ps1 -Quick    → Skip build, just upload dist/"
Write-Host "  .\deploy-rmasc.ps1 -Status   → Check all services"
Write-Host ""
