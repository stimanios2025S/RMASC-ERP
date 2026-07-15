@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  RMASC FACTORY — Build Frontend pour Production
REM  Usage : double-clic ou ./build-frontend.bat
REM ═══════════════════════════════════════════════════════════════════════════════

title RMASC FACTORY — Build Frontend
cd /d "%~dp0..\.."

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║    RMASC FACTORY — Build Frontend            ║
echo  ╚══════════════════════════════════════════════╝
echo.

if not exist node_modules (
    echo  [1/3] Installation des dépendances...
    call npm install
) else (
    echo  [1/3] Dépendances déjà installées ✓
)

echo  [2/3] Build de l'application...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo  ❌ ERREUR : Le build a échoué.
    pause
    exit /b 1
)

echo  [3/3] Build terminé avec succès !
echo.
echo  ✅ Frontend buildé dans : dist/
echo.
echo  📦 Contenu :
dir /b dist\

echo.
echo  ┌─────────────────────────────────────────────┐
echo  │  Prêt pour le déploiement !                 │
echo  │  Transférez le dossier dist/ sur le serveur │
echo  └─────────────────────────────────────────────┘
echo.
pause
