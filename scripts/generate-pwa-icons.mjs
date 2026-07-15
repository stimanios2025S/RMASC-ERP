// Generate PWA PNG icons for RMASC ERP
// Run: node scripts/generate-pwa-icons.mjs
import { writeFileSync, mkdirSync, statSync } from 'fs'
import { deflateSync } from 'zlib'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'public', 'images')
mkdirSync(OUT_DIR, { recursive: true })

function crc32(buf) {
  let c
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function createPNG(size, outPath) {
  const W = size, H = size
  // Raw image data: filter byte + 4 channels per pixel
  const raw = Buffer.alloc((W * 4 + 1) * H)
  const cx = W / 2, cy = H / 2, r = (W * 0.32) | 0

  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0 // no filter
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy
      const d = Math.sqrt(dx*dx + dy*dy)
      const idx = y * (W * 4 + 1) + 1 + x * 4
      if (d < r - 2) {
        raw[idx] = 249; raw[idx+1] = 115; raw[idx+2] = 22; raw[idx+3] = 255 // orange #F97316
      } else if (d < r + 4) {
        raw[idx] = 251; raw[idx+1] = 191; raw[idx+2] = 36; raw[idx+3] = 255 // amber ring #FBBF24
      } else if (d < r + 20) {
        raw[idx] = 30; raw[idx+1] = 41; raw[idx+2] = 59; raw[idx+3] = 255 // lighter circle bg
      } else {
        raw[idx] = 15; raw[idx+1] = 23; raw[idx+2] = 42; raw[idx+3] = 255 // slate-950 #0F172A
      }
    }
  }

  const deflated = deflateSync(raw)

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const typeB = Buffer.from(type, 'ascii')
    const crcData = Buffer.concat([typeB, data])
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcData), 0)
    return Buffer.concat([len, typeB, data, crcVal])
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const png = Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))])
  writeFileSync(outPath, png)
  const kb = (statSync(outPath).size / 1024).toFixed(1)
  console.log(`  ✅ ${outPath} (${kb} KB)`)
}

console.log('\n  🔧 Generating PWA icons...\n')
createPNG(192, resolve(OUT_DIR, 'icon-192.png'))
createPNG(512, resolve(OUT_DIR, 'icon-512.png'))
console.log('\n  🎯 PWA icons ready. Manifest: public/manifest.json\n')
