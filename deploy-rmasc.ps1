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

# Use SSH key if it exists (no more password prompts!)
$ID_ARG = ""
if (Test-Path $SSH_KEY) { $ID_ARG = "-i `"$SSH_KEY`" -o StrictHostKeyChecking=no" }

# Helper functions to run remote commands without password
function Run-SSH { param([string]$C) & cmd /c "ssh $ID_ARG $SERVER $C 2>&1" }
function Run-SCP { param([string]$S,[string]$D) & cmd /c "scp $ID_ARG -r -q $S ${SERVER}:$D 2>&1" }

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
    Run-SSH "`"echo === PM2 === && pm2 status && echo === API === && curl -s --connect-timeout 5 http://localhost:4000/api/health && echo === DISK === && df -h / | tail -1 && echo === MEMORY === && free -h | head -2`""
    exit
}

if ($Logs) {
    Write-Title "LAST 50 LOG LINES..."
    Run-SSH "`"pm2 logs rmasc-api --lines 50`""
    exit
}

# --- 1. BUILD ---
Write-Title "[1/4] BUILDING FRONTEND..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; exit 1 }
Write-OK "Frontend built"

# --- 2. CREATE DIRS ON SERVER ---
Write-Title "[2/4] ENSURING DIRECTORIES ON SERVER..."
Run-SSH "`"mkdir -p $APP_DIR/backend/src/controllers $APP_DIR/backend/src/middleware $APP_DIR/backend/src/schemas $APP_DIR/backend/src/utils $APP_DIR/backend/src/lib $APP_DIR/backend/src/models`"" | Out-Null
Write-OK "Directories ready"

# --- 3. UPLOAD ---
Write-Title "[3/4] UPLOADING FILES..."

Run-SCP "-r dist\*" "$APP_DIR/dist/"
Run-SCP "backend\api.mjs" "$APP_DIR/backend/"
Run-SCP "backend\src\controllers\*.js" "$APP_DIR/backend/src/controllers/"
Run-SCP "backend\src\middleware\*.js" "$APP_DIR/backend/src/middleware/"
Run-SCP "backend\src\schemas\*.js" "$APP_DIR/backend/src/schemas/"
Run-SCP "backend\src\utils\*.js" "$APP_DIR/backend/src/utils/"
Run-SCP "backend\src\lib\*.js" "$APP_DIR/backend/src/lib/"
Run-SCP "backend\src\models\*.js" "$APP_DIR/backend/src/models/"

Write-OK "All files uploaded"

# --- 4. RESTART (systemd) ---
Write-Title "[4/4] RESTARTING BACKEND..."
$health = Run-SSH "`"sudo systemctl daemon-reload 2>/dev/null; sudo systemctl restart rmasc-api; sleep 3; curl -s --connect-timeout 5 http://localhost:4000/api/health`""
Write-OK "Backend restarted via systemd"

# --- VERIFY ---
if (!$health) { $health = Run-SSH "`"curl -s --connect-timeout 5 http://localhost:4000/api/health 2>/dev/null || echo FAIL`"" }

Write-Host "`n  ==============================================" -ForegroundColor Green
Write-Host "    DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host "    URL: http://100.73.62.52:4000" -ForegroundColor White
if ($health) { Write-Host "    API: $($health.Substring(0, [Math]::Min(50, $health.Length)))" -ForegroundColor White }
Write-Host "  ==============================================" -ForegroundColor Green

Write-Host "`n  Commands:" -ForegroundColor Yellow
Write-Host "  .\deploy-rmasc.ps1           Full deploy"
Write-Host "  .\deploy-rmasc.ps1 -Status   Server health"
Write-Host "  .\deploy-rmasc.ps1 -Logs     Server logs"
Write-Host ""
