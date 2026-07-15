@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  RMASC FACTORY — Quick Deploy Script (Windows)
REM  Usage  : double-clic ou ./deploy-rmasc.bat
REM  What it does:
REM    1. Build the frontend (npm run build)
REM    2. Upload files to the server via SCP
REM    3. Restart the backend via SSH
REM    4. Show you the result URL
REM ═══════════════════════════════════════════════════════════════════════════════

title RMASC FACTORY — Quick Deploy

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║    RMASC FACTORY — Quick Deploy              ║
echo  ║    Server : 192.168.1.95                     ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM ─── 1. BUILD ──────────────────────────────────────────────────────────────
echo  [1/4] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo  ❌ Build failed !
    pause
    exit /b 1
)
echo  ✅ Frontend built successfully
echo.

REM ─── 2. UPLOAD ─────────────────────────────────────────────────────────────
echo  [2/4] Uploading dist/ to server...

:: Clean old files first
ssh sarlrmasc@192.168.1.95 "sudo rm -rf /opt/rmasc/dist/*"
scp -r dist\* sarlrmasc@192.168.1.95:/opt/rmasc/dist/

if %errorlevel% neq 0 (
    echo  ❌ Upload failed !
    pause
    exit /b 1
)
echo  ✅ Frontend uploaded
echo.

REM ─── 3. UPLOAD BACKEND (if changed) ──────────────────────────────────────
echo  [3/4] Syncing backend (if changes detected)...

:: Check if backend files changed since last deploy (optional)
:: For now, always sync backend api.mjs and models
ssh sarlrmasc@192.168.1.95 "mkdir -p /opt/rmasc/backend/src"
scp -r backend\api.mjs sarlrmasc@192.168.1.95:/opt/rmasc/backend/
scp -r backend\src\lib\*.mjs sarlrmasc@192.168.1.95:/opt/rmasc/backend/src/lib/ 2>nul
scp -r backend\src\models\*.js sarlrmasc@192.168.1.95:/opt/rmasc/backend/src/models/ 2>nul

echo  ✅ Backend synced
echo.

REM ─── 4. RESTART ────────────────────────────────────────────────────────────
echo  [4/4] Restarting backend service...
ssh sarlrmasc@192.168.1.95 "pm2 restart rmasc-backend 2>/dev/null || pm2 start /opt/rmasc/deploy/pm2/ecosystem.config.cjs"
echo  ✅ Backend restarted
echo.

REM ─── DONE ──────────────────────────────────────────────────────────────────
echo  ╔══════════════════════════════════════════════╗
echo  ║    🎉 DEPLOY COMPLETE !                      ║
echo  ╠══════════════════════════════════════════════╣
echo  ║  Local   :  http://192.168.1.95              ║
echo  ║  Externe :  https://sarl-rmasc.com           ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  Press any key to exit...
pause >nul
