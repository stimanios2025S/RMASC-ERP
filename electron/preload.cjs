const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  apiBaseUrl: 'http://localhost:4000',
  appVersion: '2.5.3',
  appName: 'RMASC FACTORY',

  license: {
    checkStatus: () => ipcRenderer.invoke('license:checkStatus'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
  },
});
