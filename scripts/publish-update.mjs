// ─── RMASC FACTORY — Network Publish Script ──────────────────────────────
// Copies the installer to backend/public/updates/ and generates latest.yml.
// Run: node scripts\publish-update.mjs

import { copyFileSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUILD_DIR = 'D:/RMASC-FACTORY-BUILD';
const UPDATE_DIR = join(ROOT, 'backend', 'public', 'updates');
const VERSION = '2.5.3';

// ─── Copy frontend build first if needed ────────────────────────────────
import { execSync } from 'child_process';

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  RMASC FACTORY v' + VERSION + ' — Network Publish');
console.log('═══════════════════════════════════════════════════════════════\n');

if (!existsSync(UPDATE_DIR)) mkdirSync(UPDATE_DIR, { recursive: true });

const installerName = `RMASC FACTORY-Setup-${VERSION}.exe`;
const sourceFile = join(BUILD_DIR, installerName);
const destFile = join(UPDATE_DIR, installerName);

if (!existsSync(sourceFile)) {
  console.error(`❌ Installer not found: ${sourceFile}`);
  console.error('   Files in build dir:', join(BUILD_DIR));
  console.error('   Build first: node scripts\\build-final.mjs');
  process.exit(1);
}

console.log('[1/2] 📁 Copying installer...');
copyFileSync(sourceFile, destFile);
console.log(`✅ Copied to ${destFile}\n`);

console.log('[2/2] 📄 Generating latest.yml...');
const buffer = readFileSync(destFile);
const sha512 = createHash('sha512').update(buffer).digest('hex');
const fileSize = buffer.length;

const yml = [
  `version: ${VERSION}`,
  `releaseDate: ${new Date().toISOString().split('T')[0]}T12:00:00.000Z`,
  'files:',
  `  - url: ${installerName}`,
  `    sha512: ${sha512}`,
  `    size: ${fileSize}`,
  `path: ${installerName}`,
  `sha512: ${sha512}`,
  '',
].join('\n');

writeFileSync(join(UPDATE_DIR, 'latest.yml'), yml, 'utf8');
console.log(`✅ latest.yml generated (${(fileSize/1024/1024).toFixed(1)} MB)\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ✅ UPDATE v' + VERSION + ' PUBLISHED');
console.log('');
console.log('  Clients check: http://192.168.0.189:4000/api/updates/');
console.log('  Or copy to USB: ' + sourceFile);
console.log('═══════════════════════════════════════════════════════════════\n');
