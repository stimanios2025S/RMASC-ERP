@echo off
setlocal enabledelayedexpansion
title RMASC FACTORY v2.5.2 — SUPER DEPLOY
cd /d "%~dp0"
set ROOT_DIR=%CD%

REM ─── ADMIN CHECK ──────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY v2.5.2 — SUPER DEPLOY                      ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM ════════════════════════════════════════════════════════════════════════
REM PHASE 1 — KILL ALL BLOCKING PROCESSES + NETWORK
REM ════════════════════════════════════════════════════════════════════════
echo [1/5] 🔥 Killing all blocking processes...

taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
taskkill /F /IM "RMASC FACTORY.exe" /T >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

REM Wait for locks to release
echo   ⏳ Attente 5s pour liberation des fichiers...
timeout /t 5 /nobreak >nul

REM Force network private + firewall
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"
powershell -Command "Remove-NetFirewallRule -DisplayName 'RMASC*' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'RMASC_FINAL_LAN' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Any -Enabled True -ErrorAction SilentlyContinue"
echo   ✅ Firewall + reseau configures
echo.

REM ════════════════════════════════════════════════════════════════════════
REM PHASE 2 — SILENT UNINSTALL
REM ════════════════════════════════════════════════════════════════════════
echo [2/5] 🗑️  Silent uninstall...

for /f "skip=2 tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "RMASC" 2^>nul ^| findstr "UninstallString"') do (
    set U=%%B
    if not "!U!"=="" (
        echo   🗑️  Uninstall: !U!
        start /wait "" !U! /S _?=!U! >nul 2>&1
    )
)
for /f "skip=2 tokens=2,*" %%A in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "RMASC" 2^>nul ^| findstr "UninstallString"') do (
    set U=%%B
    if not "!U!"=="" (
        echo   🗑️  Uninstall: !U!
        start /wait "" !U! /S _?=!U! >nul 2>&1
    )
)
echo   ✅ Ancienne version desinstallee
echo.

REM ════════════════════════════════════════════════════════════════════════
REM PHASE 3 — BUILD (with retry)
REM ════════════════════════════════════════════════════════════════════════
echo [3/5] 🏗️  Building RMASC FACTORY v2.5.2...
echo.

echo   🎨 Icon...
node scripts\make-icon.cjs >nul 2>&1

echo   🔑 Licence...
node scripts\generate-license-key.cjs
echo.

REM ── Build with retry ─────────────────────────────────────────────────
set BUILD_OK=0
for /l %%x in (1,1,3) do (
    echo   📦 Build tentative %%x/3...
    echo.
    call node scripts\build-final.mjs

    if exist "D:\RMASC-FACTORY-BUILD\RMASC FACTORY-Setup-2.5.2.exe" (
        set BUILD_OK=1
        goto build_done
    )
    echo   ⚠️  Echec tentative %%x, attente 10s...
    echo   🔪 Killing node processes...
    taskkill /F /IM node.exe /T >nul 2>&1
    timeout /t 10 /nobreak >nul
)
:build_done

if %BUILD_OK% equ 0 (
    echo ❌ BUILD ECHOUE — Verifiez les erreurs ci-dessus.
    pause
    exit /b 1
)

copy /Y "D:\RMASC-FACTORY-BUILD\RMASC FACTORY-Setup-2.5.2.exe" "%~dp0RMASC FACTORY-Setup-2.5.2.exe" >nul 2>&1
echo   ✅ Build termine. Installateur: D:\RMASC-FACTORY-BUILD\RMASC FACTORY-Setup-2.5.2.exe
echo.

REM ════════════════════════════════════════════════════════════════════════
REM PHASE 4 — SILENT INSTALL
REM ════════════════════════════════════════════════════════════════════════
echo [4/5] 📀 Installation silencieuse...

set INSTALLER=%~dp0RMASC FACTORY-Setup-2.5.2.exe
if not exist "%INSTALLER%" set INSTALLER=D:\RMASC-FACTORY-BUILD\RMASC FACTORY-Setup-2.5.2.exe

if exist "%INSTALLER%" (
    echo   ✅ Installation en cours...
    start /wait "" "%INSTALLER%" /S
    echo   ✅ Installation terminee
) else (
    echo   ⚠️  Installateur introuvable
)
echo.

REM ════════════════════════════════════════════════════════════════════════
REM PHASE 5 — LAUNCH
REM ════════════════════════════════════════════════════════════════════════
echo [5/5] 🚀 Lancement...

set LAUNCH=
if exist "%PROGRAMFILES%\RMASC FACTORY\RMASC FACTORY.exe" set LAUNCH="%PROGRAMFILES%\RMASC FACTORY\RMASC FACTORY.exe"
if exist "%LOCALAPPDATA%\RMASC FACTORY\RMASC FACTORY.exe" set LAUNCH="%LOCALAPPDATA%\RMASC FACTORY\RMASC FACTORY.exe"
if "%LAUNCH%"=="" if exist "D:\RMASC-FACTORY-BUILD\win-unpacked\RMASC FACTORY.exe" set LAUNCH="D:\RMASC-FACTORY-BUILD\win-unpacked\RMASC FACTORY.exe"

if not "%LAUNCH%"=="" (
    echo   ✅ Lancement...
    start "" %LAUNCH%
    timeout /t 10 /nobreak >nul
    powershell -Command "try{$r=Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 5;$j=$r.Content|ConvertFrom-Json;Write-Host ('   🩺 Status: '+$j.status+' | DB: '+$j.database) -ForegroundColor Green}catch{Write-Host '   ⏳ API demarrage...' -ForegroundColor Yellow}"
) else (
    echo   ⚠️  Executable introuvable, lancement manuel depuis le menu Demarrer
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     ✅ DEPLOIEMENT TERMINE                                  ║
echo ║                                                             ║
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4" ^| findstr /v ".*:.*:"') do (
    set IP=%%i
    goto :show_ip
)
:show_ip
echo ║   Adresse IPv4:%%IP%                                                ║
echo ║                                                             ║
echo ║   Identifiants:                                             ║
echo ║   admin / admin123 — Direction                              ║
echo ║   magasinier / magasinier — Stocks                          ║
echo ║                                                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
pause
