// ─── Load .env for scripts that run outside the Express boot path ──────────
// This is imported by standalone scripts (e.g. integration-test.ts) so they
// see the same environment variables as the running server.

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../../')

// Simple .env parser — no dependency on dotenv package.
// Supports: KEY=value, KEY="quoted value", # comments, blank lines.
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue

    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()

    // Strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (key && !process.env[key]) {
      process.env[key] = value
    }
  }
}

// Load backend/.env — always present; then backend/.env.local — optional overrides
loadEnvFile(resolve(root, '.env'))
loadEnvFile(resolve(root, '.env.local'))

// Export a flag so callers can check.
export const envLoaded = true
