// ─── Generate proper latest.yml with sha512 for electron-updater ─────────
import { createHash, createHmac } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UPDATES_DIR = join(ROOT, 'backend', 'public', 'updates');
const VERSION = '2.5.1';
const INSTALLER = `RMASC FACTORY-Setup-${VERSION}.exe`;

const installerPath = join(UPDATES_DIR, INSTALLER);
const buffer = readFileSync(installerPath);
const sha512 = createHash('sha512').update(buffer).digest('hex');
const size = buffer.length;

const yml = [
  `version: ${VERSION}`,
  `releaseDate: ${new Date().toISOString().split('T')[0]}T12:00:00.000Z`,
  'files:',
  `  - url: ${INSTALLER}`,
  `    sha512: ${sha512}`,
  `    size: ${size}`,
  `path: ${INSTALLER}`,
  `sha512: ${sha512}`,
  '',
].join('\n');

writeFileSync(join(UPDATES_DIR, 'latest.yml'), yml, 'utf8');
console.log(`✅ latest.yml generated with sha512 (${(size/1024/1024).toFixed(1)} MB)`);
