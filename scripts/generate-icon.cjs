// ─── RMASC FACTORY — Windows Icon Generator ──────────────────────────────
// Uses the PNG as-is wrapped in ICO container (modern Windows supports this).
// Run: node scripts\generate-icon.cjs

const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'assets', 'rmasc-logo.png.png');
const out = path.join(__dirname, '..', 'assets', 'icon.ico');

if (!fs.existsSync(src)) { console.error('❌ Source not found'); process.exit(1); }

const png = fs.readFileSync(src);
const header = Buffer.alloc(6); header.writeUInt16LE(0,0); header.writeUInt16LE(1,2); header.writeUInt16LE(1,4);
const entry = Buffer.alloc(16); entry.writeUInt8(0,0); entry.writeUInt8(0,1); entry.writeUInt8(0,2); entry.writeUInt8(0,3);
entry.writeUInt16LE(1,4); entry.writeUInt16LE(32,6); entry.writeUInt32LE(png.length,8); entry.writeUInt32LE(22,12);
fs.writeFileSync(out, Buffer.concat([header, entry, png]));
console.log(`✅ icon.ico (${(png.length/1024).toFixed(1)} KB)`);
