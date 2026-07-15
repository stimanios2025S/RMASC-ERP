// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Load Environment Variables
//  Charge le fichier .env à partir de la racine du backend.
//  Fonctionne sans dépendance doten v (lecture manuelle).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Remonter de src/lib/ → src/ → backend/
const envPath = resolve(__dirname, '../../.env')

try {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    // Handle variable references like ${MONGODB_URI}
    value = value.replace(/\$\{([^}]+)\}/g, (_, varName) => process.env[varName] || '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
  console.log(`  📄 Fichier .env chargé depuis ${envPath}`)
} catch (err) {
  console.warn(`  ⚠️  Fichier .env non trouvé à ${envPath}`)
  console.warn(`  ⚠️  Utilisation des variables d'environnement système`)
}
