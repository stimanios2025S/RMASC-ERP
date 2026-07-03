@echo off
title RMASC FACTORY v2.5.2 — Build Final
cd /d "%~dp0"

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY v2.5.2 — Build Installer                 ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

echo [1/3] 🎨 Generation de l'icone...
node scripts\make-icon.cjs
echo.

echo [2/3] 🔑 Generation de la cle de licence...
node scripts\generate-license-key.cjs
echo.

echo [3/3] 🏗️  Build complet...
echo  Cela prend 3-8 minutes. Ne fermez pas cette fenetre.
echo.
node scripts\build-final.mjs

if %errorlevel% neq 0 (
    echo ❌ ERREUR: Le build a echoue.
    pause
    exit /b %errorlevel%
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     ✅ BUILD TERMINE AVEC SUCCES !                          ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║                                                             ║
echo ║   Installateur :                                            ║
echo ║   D:\RMASC-FACTORY-BUILD\RMASC FACTORY-Setup-2.5.2.exe     ║
echo ║                                                             ║
echo ║   1. Copiez ce .exe sur une cle USB                        ║
echo ║   2. Desinstallez l'ancienne version sur chaque PC          ║
echo ║   3. Installez la nouvelle version                          ║
echo ║   4. Activez avec la cle de licence ci-dessus               ║
echo ║                                                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
pause
