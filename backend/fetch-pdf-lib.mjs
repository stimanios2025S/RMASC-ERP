// Minimal downloader for pdf-lib — uses Node 18+ built-in fetch
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TARGET = path.join(__dirname, 'node_modules', 'pdf-lib')
const PKG_NAME = 'pdf-lib'
const VERSION = '1.17.1'

if (fs.existsSync(TARGET)) {
  console.log('pdf-lib already installed')
  process.exit(0)
}

const bundleUrl = `https://cdn.jsdelivr.net/npm/${PKG_NAME}@${VERSION}/dist/${PKG_NAME}.min.js`
const esmUrl = `https://cdn.jsdelivr.net/npm/${PKG_NAME}@${VERSION}/dist/${PKG_NAME}.esm.min.js`
const typesUrl = `https://cdn.jsdelivr.net/npm/${PKG_NAME}@${VERSION}/dist/${PKG_NAME}.d.ts`

async function download(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`)
  return resp.text()
}

try {
  fs.mkdirSync(path.join(TARGET, 'dist'), { recursive: true })

  const [mainJs, esmJs, dts] = await Promise.all([
    download(bundleUrl),
    download(esmUrl),
    download(typesUrl).catch(() => ''),
  ])

  fs.writeFileSync(path.join(TARGET, 'package.json'), JSON.stringify({
    name: 'pdf-lib', version: VERSION, main: 'dist/pdf-lib.min.js',
    module: 'dist/pdf-lib.esm.min.js', types: 'dist/pdf-lib.d.ts',
  }, null, 2))

  fs.writeFileSync(path.join(TARGET, 'dist', 'pdf-lib.min.js'), mainJs)
  fs.writeFileSync(path.join(TARGET, 'dist', 'pdf-lib.esm.min.js'), esmJs)
  if (dts) fs.writeFileSync(path.join(TARGET, 'dist', 'pdf-lib.d.ts'), dts)

  console.log(`✅ pdf-lib@${VERSION} installed (${(mainJs.length/1024).toFixed(0)}KB)`)
} catch (e) {
  console.error(`❌ ${e.message}`)
  process.exit(1)
}
