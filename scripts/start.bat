@echo off
REM ─── RMASC FACTORY — Quick Start (Production) ─────────────────────────────
REM Usage: Double-click this file or run: scripts\start.bat
REM
REM Prerequisites:
REM   - Node.js 18+ installed
REM   - PostgreSQL accessible via DATABASE_URL (in backend/.env)
REM
REM First time? Run scripts\build.bat first, then use this.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY — Lancement                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0.."

echo [1/2] 🚀 Démarrage du backend (API)...
start "RMASC Backend" cmd /c "cd backend && npx tsx src/index.ts"
echo ✅ Backend en cours de démarrage sur http://192.168.0.189:4000
echo.

echo [2/2] 🖥️  Démarrage du frontend (Electron)...
echo.
echo Attente du backend...
:waitloop
timeout /t 2 /nobreak >nul
call node -e "const h = require('http'); h.get('http://192.168.0.189:4000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));" 2>nul
if %errorlevel% neq 0 goto waitloop

echo ✅ Backend prêt.
echo 🚀 Lancement de l'application Electron...
echo.

start "RMASC Factory" cmd /c "npx electron . --dev"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY est en cours d'exécution.                ║
echo ║     Vérifiez la fenêtre fraîchement ouverte.               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
