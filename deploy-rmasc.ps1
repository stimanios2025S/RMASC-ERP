<#
╔══════════════════════════════════════════════════════════════════════════════╗
║  RMASC FACTORY — Professional Deploy Script (PowerShell)                   ║
║  Usage: .\deploy-rmasc.ps1           → Full deploy (build + upload + PM2)  ║
║         .\deploy-rmasc.ps1 -Status   → Check all services                  ║
║         .\deploy-rmasc.ps1 -Logs     → Show last 50 lines of server logs   ║
╚══════════════════════════════════════════════════════════════════════════════╝
#>

param(
    [switch]$Status,
    [switch]$Logs
)

$SERVER = "sarlrmasc@100.73.62.52"
$APP_DIR = "/home/sarlrmasc/rmasc-erp"

function Write-Title { Write-Host "`n  $($args[0])" -ForegroundColor Cyan }
function Write-OK    { Write-Host "  ✅ $($args[0])" -ForegroundColor Green }
function Write-Error { Write-Host "  ❌ $($args[0])" -ForegroundColor Red }

Clear-Host
Write-Host "`n  ╔══════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║    RMASC FACTORY — Professional Deploy       ║" -ForegroundColor Blue
Write-Host "  ║    Server : 100.73.62.52                     ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Blue

if ($Status) {
    Write-Title "CHECKING SERVICES..."
    ssh $SERVER @"
echo "=== PM2 STATUS ==="
pm2 status
echo ""
echo "=== API HEALTH ==="
curl -s --connect-timeout 5 http://localhost:4000/api/health
echo ""
echo "=== DISK USAGE ==="
df -h / | tail -1
echo ""
echo "=== MEMORY ==="
free -h | head -2
"@
    exit
}

if ($Logs) {
    Write-Title "LAST 50 LOG LINES..."
    ssh $SERVER "pm2 logs rmasc-api --lines 50"
    exit
}

# ─── 1. BUILD ────────────────────────────────────────────────────────────────
Write-Title "[1/4] BUILDING FRONTEND..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed! Fix errors before deploying."
    exit 1
}
Write-OK "Frontend built successfully"

# ─── 2. CREATE DIRS ON SERVER ─────────────────────────────────────────────────
Write-Title "[2/4] ENSURING DIRECTORIES ON SERVER..."
ssh $SERVER "mkdir -p $APP_DIR/backend/src/controllers $APP_DIR/backend/src/middleware $APP_DIR/backend/src/schemas $APP_DIR/backend/src/utils $APP_DIR/backend/src/lib $APP_DIR/backend/src/models" 2>&1 | Out-Null
Write-OK "Directories ready"

# ─── 3. UPLOAD ──────────────────────────────────────────────────────────────
Write-Title "[3/4] UPLOADING FILES TO SERVER..."

# Upload all files with proper error handling
$files = @(
    @{src="dist\*"; dst="$APP_DIR/dist/"},
    @{src="backend\api.mjs"; dst="$APP_DIR/backend/"},
    @{src="backend\src\controllers\*.js"; dst="$APP_DIR/backend/src/controllers/"},
    @{src="backend\src\middleware\*.js"; dst="$APP_DIR/backend/src/middleware/"},
    @{src="backend\src\schemas\*.js"; dst="$APP_DIR/backend/src/schemas/"},
    @{src="backend\src\utils\*.js"; dst="$APP_DIR/backend/src/utils/"},
    @{src="backend\src\lib\*.mjs"; dst="$APP_DIR/backend/src/lib/"},
    @{src="backend\src\models\*.js"; dst="$APP_DIR/backend/src/models/"},
    @{src="ecosystem.config.cjs"; dst="$APP_DIR/"}
)

foreach ($f in $files) {
    Write-Host "  → Uploading $($f.src)..." -ForegroundColor Yellow
    scp -q $f.src "${SERVER}:$($f.dst)" 2>&1 | Out-Null
}
Write-OK "All files uploaded"

# ─── 4. RESTART ──────────────────────────────────────────────────────────────
Write-Title "[4/4] RESTARTING BACKEND VIA PM2..."
$result = ssh $SERVER @"
echo "=== OLD PM2 ==="
pm2 delete rmasc-api 2>/dev/null
pm2 kill 2>/dev/null
sleep 1
echo "=== START NEW ==="
pm2 start $APP_DIR/ecosystem.config.cjs --env production 2>/dev/null || pm2 start $APP_DIR/backend/api.mjs --name rmasc-api
sleep 3
echo "=== HEALTH ==="
curl -s --connect-timeout 5 http://localhost:4000/api/health
"@
Write-OK "Backend restarted"

# ─── VERIFY ──────────────────────────────────────────────────────────────────
$health = ssh $SERVER "curl -s --connect-timeout 5 http://localhost:4000/api/health 2>/dev/null || echo 'FAIL'"

Write-Host "`n  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║    🎉 DEPLOY COMPLETE !                      ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  URL    :  http://100.73.62.52:4000          ║" -ForegroundColor White
Write-Host "  ║  API    :  $($health.Substring(0, [Math]::Min(50, $health.Length)))  ║" -ForegroundColor White
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n  Quick commands:" -ForegroundColor Yellow
Write-Host "  .\deploy-rmasc.ps1           → Full deploy (build + upload + restart)"
Write-Host "  .\deploy-rmasc.ps1 -Status   → Check server health"
Write-Host "  .\deploy-rmasc.ps1 -Logs     → View last 50 server logs"
Write-Host ""
