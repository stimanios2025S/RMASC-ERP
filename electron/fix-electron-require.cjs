// Fix: ensure require('electron') resolves to Electron's built-in module,
// not to node_modules/electron/index.js (which returns a path string).
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') {
    // Delete the cached path-string version
    const cachedPath = Module._resolveFilename('electron', parent);
    delete require.cache[cachedPath];
    // Force resolution to the internal Electron binding by using the 'electron'
    // identifier that Electron's C++ layer intercepts.
    // We temporarily redirect resolution to the built-in module.
    const origResolve = Module._resolveFilename;
    Module._resolveFilename = function (req) {
      if (req === 'electron') return 'electron';
      return origResolve.apply(this, arguments);
    };
    try {
      const mod = origLoad.call(this, 'electron', parent, isMain);
      return mod;
    } finally {
      Module._resolveFilename = origResolve;
    }
  }
  return origLoad.apply(this, arguments);
};
