@echo off
REM ════════════════════════════════════════════════════════════════════════
REM  RMASC FACTORY — Quick Deploy (Double-click to deploy)
REM  Appelle le script PowerShell avec les bons droits.
REM  Usage : double-clic ou .\deploy-rmasc.bat
REM ════════════════════════════════════════════════════════════════════════

title RMASC FACTORY — Deploy

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║    RMASC FACTORY — Quick Deploy              ║
echo  ║    Server : 100.73.62.52                     ║
echo  ║    Script : deploy-rmasc.ps1                 ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM Vérifier si le script PowerShell existe
if not exist "deploy-rmasc.ps1" (
    echo  ❌ deploy-rmasc.ps1 introuvable !
    pause
    exit /b 1
)

REM Lancer le script PowerShell
powershell -ExecutionPolicy Bypass -File "deploy-rmasc.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  ❌ Le deploiement a echoue.
) else (
    echo.
    echo  ✅ Deploiement termine.
)

echo.
pause
