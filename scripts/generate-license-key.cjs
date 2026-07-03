// ─── RMASC FACTORY — License Key Generator ─────────────────────────────────
// Generates: GD-YYMMDD-HHHHHH
// Run: node scripts\generate-license-key.cjs

const crypto = require('crypto');
const fs = require('fs');

const SECRET = 'rmasc-license-hmac-v1-k3y!@#2026$%^';
const expDays = parseInt(process.argv[2]) || 365;

const now = new Date();
const expiresAt = new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000);
const yy = String(expiresAt.getFullYear()).slice(2);
const mm = String(expiresAt.getMonth() + 1).padStart(2, '0');
const dd = String(expiresAt.getDate()).padStart(2, '0');
const dateStr = `${yy}${mm}${dd}`;

// HMAC-SHA256 of "GD-YYMMDD"
const hmac = crypto.createHmac('sha256', SECRET)
  .update(`GD-${dateStr}`)
  .digest('hex')
  .toUpperCase()
  .slice(0, 6);

const licenseKey = `GD-${dateStr}-${hmac}`;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  RMASC FACTORY v2.4.0 — OFFICIAL LICENSE KEY');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`  KEY:     ${licenseKey}`);
console.log(`  Format:  GD-YYMMDD-HHHHHH`);
console.log(`  Expires: ${expiresAt.toLocaleDateString('fr-FR')}`);
console.log(`  Days:    ${expDays}\n`);

// Self-verify
const v = crypto.createHmac('sha256', SECRET).update(`GD-${dateStr}`).digest('hex').toUpperCase().slice(0, 6);
console.log(`  Verify:  ${hmac === v ? '✅ OK' : '❌ FAIL'}`);

fs.writeFileSync('rmasc_official_license.key', licenseKey, 'utf8');
console.log(`  Saved:   rmasc_official_license.key\n`);
