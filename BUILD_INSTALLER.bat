@echo off
title RMASC FACTORY v2.5.2 — Build Final
cd /d "%~dp0."

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY v2.5.2 — BUILD INSTALLER                  ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo Ce script va :
echo   1. Installer les dépendances
echo   2. Générer Prisma + compiler backend
echo   3. Compiler le frontend
echo   4. Embarquer Node.js portable
echo   5. Créer l'INSTALLATEUR WINDOWS (.exe)
echo.
echo   📦 Sortie : D:/RMASC-FACTORY-BUILD/
echo.
echo Appuyez sur ENTREE pour commencer...
pause >nul
echo.

node scripts\build-final.mjs

if %errorlevel% neq 0 (
    echo ❌ ERREUR: Le build a echoue. Verifiez les messages ci-dessus.
    pause
    exit /b %errorlevel%
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     ✅ BUILD TERMINE AVEC SUCCES !                          ║
echo ╠═══════════════════════════════════════════════════════════════╣
echo ║                                                             ║
echo ║   Installateur :                                            ║
echo ║   D:/RMASC-FACTORY-BUILD/RMASC FACTORY-Setup-2.5.2.exe      ║
echo ║                                                             ║
echo ║   Licence : GD-YYMMDD-HHHHHH                                ║
echo ║   Generer avec : node scripts\generate-license-key.cjs      ║
echo ║                                                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
pause
