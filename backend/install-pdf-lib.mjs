// Tiny script: download & extract pdf-lib from npm registry using Node built-ins only
import https from 'https'
import fs from 'fs'
import path from 'path'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG = 'pdf-lib'
const VERSION = '1.17.1'
const TARBALL_URL = `https://registry.npmjs.org/${PKG}/-/${PKG}-${VERSION}.tgz`
const TARGET = path.join(__dirname, 'node_modules', PKG)

if (fs.existsSync(TARGET)) {
  console.log(`pdf-lib already installed at ${TARGET}`)
  process.exit(0)
}

async function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'rmasc-installer' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

async function extractTarGz(tarData, dest) {
  // Use Node's built-in zlib for gunzip
  const { createInflate } = await import('zlib')

  // Simple tar extraction (no external deps needed)
  // npm tarballs have a "package/" prefix
  const gunzip = createInflate()
  const decompressed = await new Promise((resolve, reject) => {
    const chunks = []
    gunzip.on('data', c => chunks.push(c))
    gunzip.on('end', () => resolve(Buffer.concat(chunks)))
    gunzip.on('error', reject)
    gunzip.end(tarData)
  })

  // Parse tar format manually
  let offset = 0
  while (offset + 512 <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + 512)
    const name = header.toString('utf8', 0, 100).replace(/\0/g, '').trim()

    if (!name) break  // End of archive

    const size = parseInt(header.toString('utf8', 124, 136).replace(/\0/g, '').trim(), 8) || 0
    const type = header[156]  // 0=file, 5=dir

    offset += 512

    if (!name || name === 'package/') { offset += Math.ceil(size / 512) * 512; continue }

    const relative = name.replace(/^package\//, '')
    if (!relative) { offset += Math.ceil(size / 512) * 512; continue }

    const targetPath = path.join(dest, relative)

    if (type === 53) {  // '5' = directory
      fs.mkdirSync(targetPath, { recursive: true })
    } else if (size > 0) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      const fileContent = decompressed.subarray(offset, offset + size)
      fs.writeFileSync(targetPath, fileContent)
    }

    offset += Math.ceil(size / 512) * 512
  }
}

try {
  console.log(`Downloading ${PKG}@${VERSION} from npm registry...`)
  const tarball = await download(TARBALL_URL)
  console.log(`Downloaded ${tarball.length} bytes. Extracting...`)
  await extractTarGz(tarball, TARGET)
  console.log(`✅ pdf-lib installed at ${TARGET}`)
} catch (e) {
  console.error(`❌ Failed: ${e.message}`)
  process.exit(1)
}
