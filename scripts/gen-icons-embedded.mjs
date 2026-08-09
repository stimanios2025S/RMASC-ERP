#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Icônes PNG professionnelles (ZÉRO dépendance, zlib natif)
//  Reproduit fidèlement public/images/icon-192.svg (skyline d'ascenseurs)
//  en PNG — requis par iOS pour l'écran d'accueil (apple-touch-icon 180×180).
// ═══════════════════════════════════════════════════════════════════════════

import zlib from 'zlib'
import fs from 'fs'
import path from 'path'

// ─── PNG Encoder (RGBA, bit depth 8) ───────────────────────────────────────
function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ─── Mini renderer ─────────────────────────────────────────────────────────
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8ClampedArray(w * h * 4) }
  blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    const sa = a / 255, da = this.px[i + 3] / 255, oa = sa + da * (1 - sa)
    if (oa === 0) return
    this.px[i]     = (r * sa + this.px[i]     * da * (1 - sa)) / oa
    this.px[i + 1] = (g * sa + this.px[i + 1] * da * (1 - sa)) / oa
    this.px[i + 2] = (b * sa + this.px[i + 2] * da * (1 - sa)) / oa
    this.px[i + 3] = oa * 255
  }
  fillRect(x, y, w, h, color) {
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(this.h, Math.ceil(y + h)); yy++)
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(this.w, Math.ceil(x + w)); xx++)
        this.blend(xx, yy, color[0], color[1], color[2], color[3] ?? 255)
  }
  gradient(bg) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const t = (x + y) / (this.w + this.h)
        this.blend(x, y, bg[0][0] + (bg[1][0] - bg[0][0]) * t, bg[0][1] + (bg[1][1] - bg[0][1]) * t, bg[0][2] + (bg[1][2] - bg[0][2]) * t, 255)
      }
  }
  fillRoundedRect(x, y, w, h, r, color) {
    r = Math.min(r, w / 2, h / 2)
    this.fillRect(x + r, y, w - 2 * r, h, color)
    this.fillRect(x, y + r, w, h - 2 * r, color)
    for (let dy = 0; dy < r; dy++)
      for (let dx = 0; dx < r; dx++) {
        const d = Math.hypot(r - dx, r - dy)
        if (d <= r) {
          this.blend(Math.round(x + dx), Math.round(y + dy), color[0], color[1], color[2], color[3] ?? 255)
          this.blend(Math.round(x + w - 1 - dx), Math.round(y + dy), color[0], color[1], color[2], color[3] ?? 255)
          this.blend(Math.round(x + dx), Math.round(y + h - 1 - dy), color[0], color[1], color[2], color[3] ?? 255)
          this.blend(Math.round(x + w - 1 - dx), Math.round(y + h - 1 - dy), color[0], color[1], color[2], color[3] ?? 255)
        }
      }
  }
  strokeRoundedRect(x, y, w, h, r, stroke, fill, sw) {
    this.fillRoundedRect(x, y, w, h, r, stroke)
    this.fillRoundedRect(x + sw, y + sw, w - 2 * sw, h - 2 * sw, Math.max(0, r - sw), fill)
  }
  static FONT = {
    R: ['11110','10001','10001','11110','10100','10010','10001'],
    M: ['10001','11011','10101','10101','10001','10001','10001'],
    F: ['11111','10000','10000','11110','10000','10000','10000'],
    A: ['01110','10001','10001','11111','10001','10001','10001'],
    C: ['01111','10000','10000','10000','10000','10000','01111'],
    T: ['11111','00100','00100','00100','00100','00100','00100'],
    O: ['01110','10001','10001','10001','10001','10001','01110'],
    Y: ['10001','10001','01010','00100','00100','00100','00100'],
  }
  text(text, cx, cy, cell, color) {
    const glyphs = text.toUpperCase().split('')
    const width = glyphs.reduce((acc) => acc + 6 * cell, 0) - cell
    let x = cx - width / 2
    for (const g of glyphs) {
      const rows = Canvas.FONT[g] || Canvas.FONT['O']
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 5; c++)
          if (rows[r][c] === '1') this.fillRect(x + c * cell, cy + r * cell, cell, cell, color)
      x += 6 * cell
    }
  }
}

const SVG = 192
const SHAFTS = [
  { x: 20,  y: 30,  w: 28, h: 130 },
  { x: 56,  y: 20,  w: 28, h: 140 },
  { x: 92,  y: 10,  w: 28, h: 150 },
  { x: 128, y: 50,  w: 44, h: 110 },
]
const STROKE = 5, RADIUS = 4

// rounded=false → pleine surface SANS coins transparents.
// CRITIQUE iOS : l'apple-touch-icon ne doit JAMAIS avoir de transparence
// (iOS remplit les zones transparentes en NOIR et applique lui-même son
// masque arrondi). rounded=true → coins arrondis (icônes manifest/Android).
function drawIcon(size, rounded) {
  const s = size / SVG
  const c = new Canvas(size, size)
  c.gradient([[249, 115, 22], [234, 88, 12]])
  const WHITE = [255, 255, 255, 255]
  const SHADOW = [0, 0, 0, 0]
  for (const sh of SHAFTS) c.strokeRoundedRect(sh.x * s, sh.y * s, sh.w * s, sh.h * s, RADIUS * s, WHITE, SHADOW, STROKE * s)
  c.fillRect(20 * s, 160 * s - (STROKE / 2) * s, 152 * s, STROKE * s, WHITE)
  c.text('RM', 96 * s, (110 - 14) * s, Math.max(1, Math.round(4 * s)), WHITE)
  c.text('FACTORY', 96 * s, (140 - 7) * s, Math.max(1, Math.round(2 * s)), [251, 191, 36, 255])
  if (rounded) {
    // Masque coins arrondis → transparence en dehors (OK pour manifest,
    // jamais pour apple-touch-icon)
    const radius = Math.round(32 * s)
    const out = new Canvas(size, size)
    out.fillRoundedRect(0, 0, size, size, radius, [255, 255, 255, 255])
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (out.px[(y * size + x) * 4 + 3] === 0) {
          const i = (y * size + x) * 4
          c.px[i] = c.px[i + 1] = c.px[i + 2] = c.px[i + 3] = 0
        }
      }
  }
  return encodePNG(size, size, Buffer.from(c.px.buffer))
}

const outDir = path.resolve('public/images')
const targets = [
  { file: 'apple-touch-icon.png', size: 180, rounded: false }, // iOS: pleine surface, pas de transparence
  { file: 'icon-192.png',         size: 192, rounded: true  },
  { file: 'icon-512.png',         size: 512, rounded: true  },
]
for (const t of targets) {
  const png = drawIcon(t.size, t.rounded)
  fs.writeFileSync(path.join(outDir, t.file), png)
  console.log(`✅ ${t.file} (${t.size}×${t.size}) — ${(png.length / 1024).toFixed(1)} Ko`)
}
console.log('Icônes PNG générées.')
