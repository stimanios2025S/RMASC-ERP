const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'assets', 'rmasc-logo.png.png');
const ico = path.join(__dirname, '..', 'assets', 'icon.ico');
const png = fs.readFileSync(src);
const h = Buffer.alloc(6); h.writeUInt16LE(0,0); h.writeUInt16LE(1,2); h.writeUInt16LE(1,4);
const e = Buffer.alloc(16); e.writeUInt8(0,0); e.writeUInt8(0,1); e.writeUInt8(0,2); e.writeUInt8(0,3); e.writeUInt16LE(1,4); e.writeUInt16LE(32,6); e.writeUInt32LE(png.length,8); e.writeUInt32LE(22,12);
fs.writeFileSync(ico, Buffer.concat([h, e, png]));
console.log(`icon.ico created (${(png.length/1024).toFixed(1)} KB)`);
