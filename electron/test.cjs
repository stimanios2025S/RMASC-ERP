const path = require('path');
console.log('process.versions.electron:', process.versions.electron);
console.log('process.type:', process.type);
console.log('require.resolve("electron"):', require.resolve('electron'));
const electronPath = require.resolve('electron');
console.log('electron content:', JSON.stringify(require(electronPath)));
// Try to get the real electron module via process._linkedBinding or similar
try {
  const electron = require('electron');
  console.log('typeof electron:', typeof electron);
  if (typeof electron === 'string') {
    console.log('electron is a path string:', electron);
  } else {
    console.log('electron keys:', Object.keys(electron).slice(0, 10));
  }
} catch(e) {
  console.log('error:', e.message);
}
