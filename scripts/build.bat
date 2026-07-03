@echo off
REM ─── RMASC FACTORY — Professional Build Pipeline ──────────────────────────
REM
REM Builds the complete desktop application:
REM   1. Frontend (Vite → dist/renderer/)
REM   2. Backend (TypeScript → backend/dist/)
REM   3. Windows Installer (NSIS via electron-builder)
REM
REM Usage:
REM   scripts\build.bat              → Build portable folder (win-unpacked)
REM   scripts\build.bat --installer  → Build + NSIS Setup.exe
REM   scripts\build.bat --quick      → Skip backend build
REM
REM Output: D:/RMASC-FACTORY-BUILD/ (configurable in package.json)
REM
REM ═════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     RMASC FACTORY v2.0 — Build Pipeline                     ║
echo ║     Progiciel de Gestion Intégré pour l'Industrie Ascenseur ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

set QUICK=false
set INSTALLER=false

if /i "%1"=="--quick" set QUICK=true
if /i "%1"=="--installer" set INSTALLER=true
if /i "%2"=="--installer" set INSTALLER=true

cd /d "%~dp0.."
set ROOT_DIR=%CD%

echo [INFO]  Root directory: %ROOT_DIR%
echo [INFO]  Mode: %INSTALLER: =%setup installer%%QUICK: =%quick build%%
echo.

REM ─── Step 1: Frontend dependencies ─────────────────────────────────────────
echo ═══════════════════════════════════════════════════════════════
echo   [1/5] 📦 Frontend dependencies...
echo ═══════════════════════════════════════════════════════════════
call npm install
if %errorlevel% neq 0 (
    echo ❌ ÉCHEC — Frontend npm install
    exit /b %errorlevel%
)
echo ✅ Frontend dependencies installed.
echo.

if "%QUICK%"=="true" goto skip_backend

REM ─── Step 2: Backend dependencies ──────────────────────────────────────────
echo ═══════════════════════════════════════════════════════════════
echo   [2/5] 📦 Backend dependencies...
echo ═══════════════════════════════════════════════════════════════
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ ÉCHEC — Backend npm install
    exit /b %errorlevel%
)
cd %ROOT_DIR%
echo ✅ Backend dependencies installed.
echo.

REM ─── Step 3: Prisma Client ─────────────────────────────────────────────────
echo ═══════════════════════════════════════════════════════════════
echo   [3/5] 🗄️  Prisma Client generation...
echo ═══════════════════════════════════════════════════════════════
cd backend
call npx prisma generate
if %errorlevel% neq 0 (
    echo ⚠️  Prisma generate failed — check DATABASE_URL in .env
) else (
    echo ✅ Prisma client generated.
)
cd %ROOT_DIR%
echo.

REM ─── Step 4: Backend compilation ───────────────────────────────────────────
echo ═══════════════════════════════════════════════════════════════
echo   [4/5] 🔧 Compiling backend (TypeScript)...
echo ═══════════════════════════════════════════════════════════════
cd backend
call npx tsc
if %errorlevel% neq 0 (
    echo ❌ ÉCHEC — TypeScript compilation
    exit /b %errorlevel%
)
cd %ROOT_DIR%
echo ✅ Backend compiled → backend/dist/
echo.

:skip_backend
if "%QUICK%"=="true" (
    echo ═══════════════════════════════════════════════════════════════
    echo   [2/5] ⏭️  SKIP — Backend (--quick mode)
    echo   [3/5] ⏭️  SKIP — Prisma
    echo   [4/5] ⏭️  SKIP — TypeScript
    echo ═══════════════════════════════════════════════════════════════
    echo.
)

REM ─── Step 5: Frontend build ────────────────────────────────────────────────
echo ═══════════════════════════════════════════════════════════════
echo   [5/5] 🎨 Building frontend (Vite)...
echo ═══════════════════════════════════════════════════════════════
call npx vite build
if %errorlevel% neq 0 (
    echo ❌ ÉCHEC — Vite build
    exit /b %errorlevel%
)
echo ✅ Frontend built → dist/renderer/
echo.

REM ─── Package ───────────────────────────────────────────────────────────────
set CSC_IDENTITY_AUTO_DISCOVERY=false

if "%INSTALLER%"=="true" (
    echo ═══════════════════════════════════════════════════════════════
    echo   📀 Creating Windows Installer (NSIS)...
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo   This will generate:
    echo     D:/RMASC-FACTORY-BUILD/RMASC FACTORY-Setup-2.0.0.exe
    echo.
    call npx electron-builder --win nsis
    if %errorlevel% neq 0 (
        echo ❌ ÉCHEC — electron-builder
        exit /b %errorlevel%
    )
    echo.
    echo ✅ Installer created!
) else (
    echo ═══════════════════════════════════════════════════════════════
    echo   📀 Packaging portable folder...
    echo ═══════════════════════════════════════════════════════════════
    call npx electron-builder --win dir
    if %errorlevel% neq 0 (
        echo ❌ ÉCHEC — electron-builder
        exit /b %errorlevel%
    )
    echo ✅ Portable build created!
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     ✅ BUILD COMPLETE                                       ║
echo ║                                                             ║
if "%INSTALLER%"=="true" (
    echo ║     📦 D:/RMASC-FACTORY-BUILD/                            ║
    echo ║     🏠 RMASC FACTORY-Setup-2.0.0.exe                     ║
) else (
    echo ║     📦 D:/RMASC-FACTORY-BUILD/win-unpacked/               ║
    echo ║     🏠 RMASC FACTORY.exe                                 ║
)
echo ║                                                             ║
echo ║     Instructions:                                           ║
if "%INSTALLER%"=="true" (
    echo ║     1. Run the Setup.exe                                 ║
    echo ║     2. Follow installation wizard                        ║
    echo ║     3. Launch from desktop shortcut                     ║
    echo ║     4. Enter license key on first launch                ║
) else (
    echo ║     1. Copy win-unpacked/ to target PC                   ║
    echo ║     2. Run RMASC FACTORY.exe                             ║
    echo ║     3. Enter license key on first launch                ║
)
echo ║                                                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

endlocal
