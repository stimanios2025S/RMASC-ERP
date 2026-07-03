try {
  const electronModule = require('electron');
  console.log('typeof module:', typeof electronModule);
  if (typeof electronModule === 'object') {
    const keys = Object.keys(electronModule).slice(0, 30);
    console.log('keys:', JSON.stringify(keys));
    console.log('has app:', 'app' in electronModule);
    console.log('has BrowserWindow:', 'BrowserWindow' in electronModule);
    if (electronModule.app) {
      console.log('app.whenReady:', typeof electronModule.app.whenReady);
    }
  } else if (typeof electronModule === 'string') {
    console.log('module is string:', electronModule);
  }
} catch (e) {
  console.log('ERROR:', e.message);
}
