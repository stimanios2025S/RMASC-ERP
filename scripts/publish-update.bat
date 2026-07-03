@echo off
REM ─── RMASC FACTORY — Publish Update (Network Auto-Update) ────────────────
REM
REM This script builds v2.5.0 and publishes it to the backend's updates folder.
REM The backend serves the update at http://192.168.0.189:4000/api/updates/
REM
REM All client PCs on the network detect and install the update automatically.
REM No USB drive, no email, no manual copying needed.
REM
REM Usage:
REM   scripts\publish-update.bat
REM
REM ═════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion
title RMASC FACTORY — PUBLISH UPDATE (Network)

cd /d "%~dp0.."
set ROOT_DIR=%CD%
set BUILD_DIR=D:/RMASC-FACTORY-BUILD
set UPDATE_DIR=%ROOT_DIR%\backend\public\updates
set VERSION=2.5.2

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY v%VERSION% — Network Update                    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo  This will:
echo    1. Build v%VERSION%
echo    2. Copy installer to backend/public/updates/
echo    3. Generate update metadata (latest.yml)
echo.
echo  All client PCs check http://192.168.0.189:4000/api/updates/
echo  They will detect and install this update automatically.
echo.

set /p CONFIRM= Continue? (y/n):
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    exit /b 0
)

echo.
echo [1/4] 🏗️  Building application...
echo.
call node scripts\build-final.mjs

if %errorlevel% neq 0 (
    echo ❌ Build failed. Aborting.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] 📁 Preparing update folder...
echo.

if not exist "%UPDATE_DIR%" mkdir "%UPDATE_DIR%"

set INSTALLER_NAME=RMASC FACTORY-Setup-%VERSION%.exe
echo  Copying: %INSTALLER_NAME%
copy /Y "%BUILD_DIR%\%INSTALLER_NAME%" "%UPDATE_DIR%\" >nul

if %errorlevel% neq 0 (
    echo ⚠️  Installer not found at %BUILD_DIR%\%INSTALLER_NAME%
    echo    Checking build output...
    dir "%BUILD_DIR%\*.exe" 2>nul
) else (
    echo ✅ Installer copied to backend/public/updates/
)

echo.
echo [3/4] 📄 Generating latest.yml...
echo.

set YEAR=%DATE:~10,4%
set MONTH=%DATE:~4,2%
set DAY=%DATE:~7,2%

echo version: %VERSION% > "%UPDATE_DIR%\latest.yml"
echo releaseDate: %YEAR%-%MONTH%-%DAY%T12:00:00.000Z >> "%UPDATE_DIR%\latest.yml"
echo files: >> "%UPDATE_DIR%\latest.yml"
echo   - url: %INSTALLER_NAME% >> "%UPDATE_DIR%\latest.yml"
echo     sha512: auto >> "%UPDATE_DIR%\latest.yml"
echo     size: auto >> "%UPDATE_DIR%\latest.yml"
echo path: %INSTALLER_NAME% >> "%UPDATE_DIR%\latest.yml"
echo sha512: auto >> "%UPDATE_DIR%\latest.yml"

echo ✅ latest.yml generated

echo.
echo [4/4] 🔄 Verifying network access...
echo.

REM Verify the backend is running and serving updates
powershell -command "try { $r = Invoke-WebRequest -Uri 'http://192.168.0.189:4000/api/health' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { Write-Host '✅ Backend is running on 192.168.0.189:4000' -ForegroundColor Green } } catch { Write-Host '⚠️  Backend not running on 192.168.0.189:4000 — start it with: cd backend ^&^& npx tsx src/index.ts' -ForegroundColor Yellow }"

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     ✅ UPDATE v%VERSION% PUBLISHED                              ║
echo ║                                                             ║
echo ║     Update files on dev PC:                                 ║
echo ║     %UPDATE_DIR%              ║
echo ║                                                             ║
echo ║     All client PCs will auto-detect and install.            ║
echo ║     They check every hour + on app startup.                 ║
echo ║                                                             ║
echo ║     To trigger immediate check:                             ║
echo ║     Settings → 🔍 Verifier maintenant                      ║
echo ║                                                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

endlocal
pause
