// ─── RMASC FACTORY — Electron Main Process (Demo Mode) ────────────────────
// For the factory demo: no backend needed, app runs 100% locally.
// When cloud server is ready, set VITE_API_URL and re-enable backend.

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const SPLASH_HTML = require('./splash.cjs');
const license = require('./license.cjs');

const APP_VERSION = '2.5.3';
const FRONTEND_DEV_PORT = 5173;

let mainWindow = null;
let splashWindow = null;

const isDev = process.env.NODE_ENV === 'development' ||
              process.argv.includes('--dev') ||
              !app.isPackaged;

function resolveAsset(r) {
  for (const p of [path.join(__dirname, '..', r), path.join(process.resourcesPath || '', r)])
    if (fs.existsSync(p)) return p;
  return null;
}
function getAppIcon() { return resolveAsset('assets/icon.ico') || path.join(__dirname, '..', 'assets', 'rmasc-logo.png.png'); }

function registerLicenseIpc() {
  ipcMain.handle('license:checkStatus', () => license.checkLicenseStatus());
  ipcMain.handle('license:activate', (_e, k) => {
    if (!k || typeof k !== 'string') return { success: false, error: 'Clé invalide.' };
    const r = license.validateLicense(k.trim());
    if (r.valid) return { success: true, status: r };
    return { success: false, error: r.error };
  });
  ipcMain.handle('license:getInfo', () => license.checkLicenseInfo());
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420, height: 520, frame: false, resizable: false, center: true, show: false,
    backgroundColor: '#0f172a', icon: getAppIcon(),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
  splashWindow.once('ready-to-show', () => { if (!mainWindow) splashWindow.show(); });
}
function destroySplash() { if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; } }

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1200, minHeight: 800, show: false,
    backgroundColor: '#0f172a', icon: getAppIcon(),
    title: 'RMASC FACTORY — v2.5.3',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, allowRunningInsecureContent: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    cb({
      responseHeaders: {
        ...d.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['Content-Type', 'Authorization'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      },
    });
  });

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${FRONTEND_DEV_PORT}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const p = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');
    if (fs.existsSync(p)) mainWindow.loadFile(p);
    else mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<html><body style="background:#0f172a;color:#f59e0b;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">⚠️ Build manquant</body></html>')}`);
  }

  mainWindow.once('ready-to-show', () => { destroySplash(); mainWindow.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function initialize() {
  registerLicenseIpc();
  createSplash();
  await new Promise(r => setTimeout(r, 1500)); // brief splash
  createMainWindow();
}

app.whenReady().then(initialize);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
