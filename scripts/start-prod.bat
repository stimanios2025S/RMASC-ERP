@echo off
REM ─── RMASC FACTORY — Production Launch (from build output) ─────────────────
REM This launches the pre-built application from D:/RMASC-FACTORY-BUILD/
REM
REM Usage:
REM   1. Run scripts\build.bat first (one time)
REM   2. Then use this script to launch anytime
REM
REM Or just run: D:/RMASC-FACTORY-BUILD/win-unpacked/RMASC FACTORY.exe

set BUILD_DIR=D:/RMASC-FACTORY-BUILD

if exist "%BUILD_DIR%\win-unpacked\RMASC FACTORY.exe" (
    echo 🚀 Lancement de RMASC FACTORY...
    start "" "%BUILD_DIR%\win-unpacked\RMASC FACTORY.exe"
    echo ✅ Application lancée.
) else if exist "%BUILD_DIR%\RMASC FACTORY Setup *.exe" (
    echo 📦 Installateur trouvé. Lancez-le pour installer l'application.
    start "" "%BUILD_DIR%"
) else (
    echo ⚠️  Build introuvable dans %BUILD_DIR%
    echo.
    echo Exécutez d'abord: scripts\build.bat --installer
    echo.
    pause
)
