<#
===============================================================================
  RMASC FACTORY - Professional Deploy Script (PowerShell)
  Usage: .\deploy-rmasc.ps1           Full deploy (build + upload + restart)
         .\deploy-rmasc.ps1 -Status   Check server health
         .\deploy-rmasc.ps1 -Logs     Show last 50 server log lines
===============================================================================
#>

param(
    [switch]$Status,
    [switch]$Logs
)

$SERVER = "sarlrmasc@100.73.62.52"
$APP_DIR = "/home/sarlrmasc/rmasc-erp"
$SSH_KEY = "$env:USERPROFILE\.ssh\github-deploy-key"

# Use SSH key if it exists, otherwise fall back to password
if (Test-Path $SSH_KEY) {
    $SSH_OPTS = "-i $SSH_KEY -o PasswordAuthentication=no -o StrictHostKeyChecking=no"
    $SCP_OPTS = "-i $SSH_KEY -o PasswordAuthentication=no -o StrictHostKeyChecking=no"
} else {
    $SSH_OPTS = ""
    $SCP_OPTS = ""
}

function Write-Title { Write-Host "`n  $($args[0])" -ForegroundColor Cyan }
function Write-OK    { Write-Host "  [OK] $($args[0])" -ForegroundColor Green }
function Write-Error { Write-Host "  [ERROR] $($args[0])" -ForegroundColor Red }

Clear-Host
Write-Host "`n  ==============================================" -ForegroundColor Blue
Write-Host "    RMASC FACTORY - Professional Deploy" -ForegroundColor Blue
Write-Host "    Server: 100.73.62.52" -ForegroundColor Blue
Write-Host "  ==============================================" -ForegroundColor Blue

if ($Status) {
    Write-Title "CHECKING SERVICES..."
    ssh $SSH_OPTS $SERVER @"
echo "=== PM2 STATUS ==="
pm2 status
echo ""
echo "=== API HEALTH ==="
curl -s --connect-timeout 5 http://localhost:4000/api/health
echo ""
echo "=== DISK ==="
df -h / | tail -1
echo ""
echo "=== MEMORY ==="
free -h | head -2
"@
    exit
}

if ($Logs) {
    Write-Title "LAST 50 LOG LINES..."
    ssh $SSH_OPTS $SERVER "pm2 logs rmasc-api --lines 50"
    exit
}

# --- 1. BUILD ---
Write-Title "[1/4] BUILDING FRONTEND..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed! Fix errors before deploying."
    exit 1
}
Write-OK "Frontend built"

# --- 2. CREATE DIRS ON SERVER ---
Write-Title "[2/4] ENSURING DIRECTORIES ON SERVER..."
ssh $SSH_OPTS $SERVER "mkdir -p $APP_DIR/backend/src/controllers $APP_DIR/backend/src/middleware $APP_DIR/backend/src/schemas $APP_DIR/backend/src/utils $APP_DIR/backend/src/lib $APP_DIR/backend/src/models" 2>&1 | Out-Null
Write-OK "Directories ready"

# --- 3. UPLOAD ---
Write-Title "[3/4] UPLOADING FILES..."

scp $SCP_OPTS -q -r dist\* "${SERVER}:$APP_DIR/dist/"
scp $SCP_OPTS -q backend\api.mjs "${SERVER}:$APP_DIR/backend/"
scp $SCP_OPTS -q backend\src\controllers\*.js "${SERVER}:$APP_DIR/backend/src/controllers/"
scp $SCP_OPTS -q backend\src\middleware\*.js "${SERVER}:$APP_DIR/backend/src/middleware/"
scp $SCP_OPTS -q backend\src\schemas\*.js "${SERVER}:$APP_DIR/backend/src/schemas/"
scp $SCP_OPTS -q backend\src\utils\*.js "${SERVER}:$APP_DIR/backend/src/utils/"
scp $SCP_OPTS -q backend\src\lib\*.js "${SERVER}:$APP_DIR/backend/src/lib/"
scp $SCP_OPTS -q backend\src\models\*.js "${SERVER}:$APP_DIR/backend/src/models/"
scp $SCP_OPTS -q ecosystem.config.cjs "${SERVER}:$APP_DIR/"

Write-OK "All files uploaded"

# --- 4. RESTART (systemd) ---
Write-Title "[4/4] RESTARTING BACKEND..."
ssh $SSH_OPTS $SERVER @"
sudo systemctl daemon-reload 2>/dev/null
sudo systemctl restart rmasc-api
sleep 3
curl -s --connect-timeout 5 http://localhost:4000/api/health
"@
Write-OK "Backend restarted via systemd"

# --- VERIFY ---
$health = ssh $SSH_OPTS $SERVER "curl -s --connect-timeout 5 http://localhost:4000/api/health 2>/dev/null || echo 'FAIL'"

Write-Host "`n  ==============================================" -ForegroundColor Green
Write-Host "    DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host "    URL: http://100.73.62.52:4000" -ForegroundColor White
Write-Host "    API: $($health.Substring(0, [Math]::Min(50, $health.Length)))" -ForegroundColor White
Write-Host "  ==============================================" -ForegroundColor Green

Write-Host "`n  Commands:" -ForegroundColor Yellow
Write-Host "  .\deploy-rmasc.ps1           Full deploy"
Write-Host "  .\deploy-rmasc.ps1 -Status   Server health"
Write-Host "  .\deploy-rmasc.ps1 -Logs     Server logs"
Write-Host ""
