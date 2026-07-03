// ─── RMASC FACTORY — Production Auto-Update System ───────────────────────
// Uses Node.js http module for Electron main-process compatibility.
// When "Mettre à jour maintenant" is clicked: download → quit → install → reopen.

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) { console.log('[UPDATER] Not loaded:', e.message); }

const { app } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HOST = '192.168.0.189';
const PORT = 4000;
const BASE_PATH = '/api/updates';

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: HOST, port: PORT, path: urlPath, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────
function registerUpdaterIpc(ipcMain) {
  ipcMain.handle('updater:checkNow', async () => {
    try {
      const result = await httpGet(`${BASE_PATH}/check`);
      if (!result) return { updateAvailable: false, error: `🔌 Serveur inaccessible.\n\nVérifiez que le PC principal (${HOST}) est allumé et que le backend tourne sur le port ${PORT}.` };
      if (result.updateAvailable) return result;
      return { updateAvailable: false };
    } catch (err) {
      return { updateAvailable: false, error: `🔌 Erreur de connexion: ${err.message}` };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    if (!autoUpdater) return { success: false, error: 'Module de mise à jour non disponible.' };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    if (!autoUpdater) return { success: false, error: 'Module de mise à jour non disponible.' };
    // Force close, apply update, reopen automatically
    setImmediate(() => {
      autoUpdater.quitAndInstall();
      app.quit();
    });
    return { success: true };
  });

  ipcMain.handle('trigger-update', async () => {
    if (!autoUpdater) return { success: false, error: 'Module de mise à jour non disponible.' };
    try {
      await autoUpdater.downloadUpdate();
      setImmediate(() => {
        autoUpdater.quitAndInstall();
        app.quit();
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── App version ─────────────────────────────────────────────────────
  ipcMain.handle('get-app-version', () => app.getVersion());
}

// ─── Events ──────────────────────────────────────────────────────────────
function initUpdateEvents(mainWindow) {
  if (!autoUpdater || !mainWindow) return;

  autoUpdater.on('update-available', (info) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:update-available', { version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:update-not-available');
  });
  autoUpdater.on('download-progress', (p) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:download-progress', {
      percent: Math.round(p.percent),
      speed: `${(p.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`,
      transferred: `${(p.transferred / 1024 / 1024).toFixed(1)} MB`,
      total: `${(p.total / 1024 / 1024).toFixed(1)} MB`,
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:update-downloaded', { version: info.version });
  });
  autoUpdater.on('error', (err) => {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('enoent') || msg.includes('no update')) {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:update-not-available');
      return;
    }
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:error', { message: err.message });
  });

  // Check 15s after startup, then every 10 minutes
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 15000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 10 * 60 * 1000);
}

// ─── Init ────────────────────────────────────────────────────────────────
function initAutoUpdater(ipcMain, mainWindow) {
  registerUpdaterIpc(ipcMain);
  if (app.isPackaged && autoUpdater) {
    autoUpdater.setFeedURL({ provider: 'generic', url: `http://${HOST}:${PORT}${BASE_PATH}`, channel: 'latest' });
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    initUpdateEvents(mainWindow);
  }
}

module.exports = { initAutoUpdater };
