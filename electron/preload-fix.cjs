// Fix: ensures require('electron') resolves to Electron's built-in module API
// rather than the npm package (which returns a path string).
// Load this via: electron -r ./electron/preload-fix.cjs .
// or add `"electron": { "require": "./electron/preload-fix.cjs" }` in package.json

const Module = require('module');
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent) {
  // When someone requires 'electron', force a resolution to Electron's
  // built-in module by returning a fake path that triggers Electron's
  // C++ module interceptor. The interceptor catches MODULE_NOT_FOUND
  // for 'electron' and returns the real built-in API.
  if (request === 'electron') {
    // Return a non-existent path so Node throws MODULE_NOT_FOUND,
    // which Electron's C++ hook then intercepts.
    return '/electron-builtin';
  }
  return origResolve.call(this, request, parent);
};

// Small guard: wrap any require('electron') in main.cjs with our fix
// by restoring original resolver after the first call to prevent leaks.
// But we keep the patch active since main.cjs is the only user.
