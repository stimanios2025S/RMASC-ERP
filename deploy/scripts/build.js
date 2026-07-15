// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Build Script (Programmatic)
//  Utilise l'API Vite pour build le frontend sans CLI
// ═══════════════════════════════════════════════════════════════════════════════

import { build } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

console.log('')
console.log('  ╔══════════════════════════════════════════════╗')
console.log('  ║    RMASC FACTORY — Build Frontend            ║')
console.log('  ╚══════════════════════════════════════════════╝')
console.log('')
console.log(`  📂 Root: ${root}`)
console.log('')

try {
  const result = await build({
    root,
    logLevel: 'info',
  })
  console.log('')
  console.log('  ✅ Build terminé avec succès !')
  console.log(`  📦 Output: ${resolve(root, 'dist')}`)
  console.log('')
} catch (err) {
  console.error('')
  console.error('  ❌ Erreur de build:')
  console.error(`  ${err.message}`)
  console.error('')
  process.exit(1)
}
