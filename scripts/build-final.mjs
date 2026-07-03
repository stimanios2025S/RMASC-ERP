// ─── RMASC FACTORY — Build Script (Demo Mode) ─────────────────────────────
// Frontend only. No backend, no Prisma, no TypeScript compilation.
// The app runs 100% locally with localStorage data.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORTABLE_NODE_DIR = join(ROOT, 'portable-node');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(label, msg) { console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${label} ${msg}`); }

function step(n, msg) {
  console.log(`\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}${BOLD}  [${n}/5] ${msg}${RESET}`);
  console.log(`${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);
}

function run(cmd, opts = {}) {
  const r = spawnSync(cmd, [], { shell: true, cwd: ROOT, stdio: 'inherit', ...opts });
  if (r.status !== 0) { console.error(`${RED}❌ ÉCHEC: ${cmd}${RESET}`); process.exit(r.status); }
}

async function main() {
  console.clear();
  console.log(`\n${BOLD}${CYAN}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RMASC FACTORY v2.5.3 — BUILD (Mode Local)                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}\n`);

  step(1, '📦 Frontend dependencies...');
  run('npm install');

  step(2, '🎨 Frontend (Vite)...');
  run('npx vite build');

  step(3, '📦 Node.js portable...');
  if (!existsSync(PORTABLE_NODE_DIR)) mkdirSync(PORTABLE_NODE_DIR, { recursive: true });
  const nodeExe = join(PORTABLE_NODE_DIR, 'node.exe');
  if (!existsSync(nodeExe)) {
    log('📋', `Copie de Node.js depuis: ${process.execPath}`);
    copyFileSync(process.execPath, nodeExe);
  }
  const size = existsSync(nodeExe) ? readFileSync(nodeExe).length : 0;
  log('📊', `Node.exe: ${(size / 1024 / 1024).toFixed(1)} MB`);

  step(4, '📀 Installateur Windows...');
  run('set CSC_IDENTITY_AUTO_DISCOVERY=false && npx electron-builder --win nsis');

  console.log(`\n${GREEN}${BOLD}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ BUILD TERMINÉ !                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  D:/RMASC-FACTORY-BUILD/RMASC FACTORY-Setup-2.5.3.exe       ║');
  console.log('║                                                             ║');
  console.log('║  Mode 100% LOCAL — aucun backend requis                     ║');
  console.log('║  Login avec admin / admin123                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}\n`);
}

main().catch(err => {
  console.error(`${RED}${BOLD}❌ Erreur fatale: ${err.message}${RESET}`);
  process.exit(1);
});
