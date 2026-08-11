// ─── Analyseur PDF : extrait texte + coordonnées (pour trouver la signature) ───
// Usage: node scripts/analyze-pdf.mjs "<chemin.pdf>" [page]
import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

const filePath = process.argv[2]
if (!filePath) { console.error('Usage: node scripts/analyze-pdf.mjs <fichier.pdf> [page]'); process.exit(1) }
const onlyPage = process.argv[3] ? parseInt(process.argv[3], 10) : null

const pdfBytes = fs.readFileSync(filePath)
const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false })
const pages = pdfDoc.getPages()
console.log(`\n📄 ${path.basename(filePath)} — ${pages.length} page(s), format: ${Math.round(pages[0].getWidth())} × ${Math.round(pages[0].getHeight())} pts (A4 = 595×842)`)

// ── Parser de flux de contenu PDF ─────────────────────────────────────────
function parseContent(content) {
  const tokens = []
  let i = 0
  const len = content.length
  while (i < len) {
    const ch = content[i]
    // Whitespace
    if (ch === 0 || ch === 9 || ch === 10 || ch === 12 || ch === 13 || ch === 32) { i++; continue }
    // Comment
    if (ch === 37) { while (i < len && content[i] !== 10 && content[i] !== 13) i++; continue }
    // String ( ... )
    if (ch === 40) {
      let j = i + 1, depth = 1, out = ''
      while (j < len && depth > 0) {
        const c = content[j]
        if (c === 92) { // backslash escape
          const e = content[j + 1]
          const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }
          if (map[e] !== undefined) out += map[e]
          else if (e >= 48 && e <= 55) { // octal
            let octal = e - 48, k = 1
            while (k < 3 && content[j + 1 + k] >= 48 && content[j + 1 + k] <= 55) { octal = octal * 8 + (content[j + 1 + k] - 48); k++ }
            out += String.fromCharCode(octal); j += k - 1
          } else if (e === 13 && content[j + 2] === 10) { j++ } // line continuation
          else if (e === 10 || e === 13) { /* line continuation */ }
          else out += e
          j += 2; continue
        }
        if (c === 40) depth++
        if (c === 41) { depth--; if (depth === 0) break }
        out += String.fromCharCode(c)
        j++
      }
      tokens.push({ t: 'str', v: out, rawLen: j - i + 1 })
      i = j + 1; continue
    }
    // Hex string <...>
    if (ch === 60) {
      let j = i + 1, hex = ''
      while (j < len && content[j] !== 62) { const c = content[j]; if (![10,13,32].includes(c)) hex += String.fromCharCode(c); j++ }
      const bytes = hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)).filter(n => !isNaN(n)) || []
      tokens.push({ t: 'str', v: String.fromCharCode(...bytes), rawLen: j - i + 1 })
      i = j + 1; continue
    }
    // Name /Name
    if (ch === 47) {
      let j = i + 1, name = ''
      while (j < len && !/[\s()<>[\]{}/%]/.test(String.fromCharCode(content[j]))) { name += String.fromCharCode(content[j]); j++ }
      tokens.push({ t: 'name', v: name })
      i = j; continue
    }
    // Array [
    if (ch === 91) { tokens.push({ t: 'op', v: '[' }); i++; continue }
    if (ch === 93) { tokens.push({ t: 'op', v: ']' }); i++; continue }
    // Number
    if ((ch >= 48 && ch <= 57) || ch === 45 || ch === 43 || ch === 46) {
      let j = i, num = ''
      while (j < len && /[0-9+\-.eE]/.test(String.fromCharCode(content[j]))) { num += String.fromCharCode(content[j]); j++ }
      tokens.push({ t: 'num', v: parseFloat(num) })
      i = j; continue
    }
    // Keyword/operator
    let j = i
    while (j < len && !/[ \t\r\n()<>[\]{}/%]/.test(String.fromCharCode(content[j]))) j++
    tokens.push({ t: 'op', v: content.subarray(i, j).toString() })
    i = j
  }
  return tokens
}

// ── Décodage texte (essai WinAnsi, sinon hex) ─────────────────────────────
function decodeText(s) {
  const winAnsiMap = { 0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ', 0xA0: ' ', 0xA7: '§', 0xA9: '©', 0xAB: '«', 0xAC: '¬', 0xAE: '®', 0xB0: '°', 0xB1: '±', 0xB5: 'µ', 0xB6: '¶', 0xBB: '»', 0xC0: 'À', 0xC1: 'Á', 0xC2: 'Â', 0xC3: 'Ã', 0xC4: 'Ä', 0xC5: 'Å', 0xC6: 'Æ', 0xC7: 'Ç', 0xC8: 'È', 0xC9: 'É', 0xCA: 'Ê', 0xCB: 'Ë', 0xCC: 'Ì', 0xCD: 'Í', 0xCE: 'Î', 0xCF: 'Ï', 0xD0: 'Ð', 0xD1: 'Ñ', 0xD2: 'Ò', 0xD3: 'Ó', 0xD4: 'Ô', 0xD5: 'Õ', 0xD6: 'Ö', 0xD7: '×', 0xD8: 'Ø', 0xD9: 'Ù', 0xDA: 'Ú', 0xDB: 'Û', 0xDC: 'Ü', 0xDD: 'Ý', 0xDE: 'Þ', 0xDF: 'ß', 0xE0: 'à', 0xE1: 'á', 0xE2: 'â', 0xE3: 'ã', 0xE4: 'ä', 0xE5: 'å', 0xE6: 'æ', 0xE7: 'ç', 0xE8: 'è', 0xE9: 'é', 0xEA: 'ê', 0xEB: 'ë', 0xEC: 'ì', 0xED: 'í', 0xEE: 'î', 0xEF: 'ï', 0xF0: 'ð', 0xF1: 'ñ', 0xF2: 'ò', 0xF3: 'ó', 0xF4: 'ô', 0xF5: 'õ', 0xF6: 'ö', 0xF7: '÷', 0xF8: 'ø', 0xF9: 'ù', 0xFA: 'ú', 0xFB: 'û', 0xFC: 'ü', 0xFD: 'ý', 0xFE: 'þ', 0xFF: 'ÿ' }
  let out = ''
  let printable = 0
  for (let k = 0; k < s.length; k++) {
    const code = s.charCodeAt(k)
    if (code >= 32 && code < 127) { out += s[k]; printable++ }
    else if (winAnsiMap[code] !== undefined) { out += winAnsiMap[code]; printable++ }
    else out += `\\x${code.toString(16).padStart(2, '0')}`
  }
  return { text: out, printableRatio: printable / Math.max(1, s.length) }
}

// ── Extraction par page ───────────────────────────────────────────────────
function extractPage(page, pageNum) {
  const items = []
  try {
    const contentRefs = page.node.normalizedEntries().Contents
    const streams = []
    if (contentRefs) {
      const refs = Array.isArray(contentRefs) ? contentRefs : [contentRefs]
      for (const ref of refs) {
        const stream = ref?.get?.(() => undefined)
        if (stream) streams.push(stream)
        else {
          const direct = page.node.Contents()
          streams.push(direct)
        }
      }
    }
    for (const streamObj of streams) {
      let content = streamObj
      if (typeof streamObj === 'object' && streamObj.decodedContents) content = streamObj.decodedContents
      if (content instanceof Uint8Array) content = Buffer.from(content)
      if (!Buffer.isBuffer(content)) continue
      const tokens = parseContent(content)
      // Interpréteur minimal : BT/ET, Tf, Td/TD/Tm/T*, Tj/TJ/'
      let inText = false
      let tm = [1, 0, 0, 1, 0, 0]   // text matrix
      let tl = [1, 0, 0, 1, 0, 0]   // text line matrix
      let fontSize = 0
      let pending = []              // args accumulation
      let i = 0
      while (i < tokens.length) {
        const tok = tokens[i]
        if (tok.t === 'num' || tok.t === 'str' || tok.t === 'name' || (tok.t === 'op' && tok.v === '[')) {
          pending.push(tok); i++; continue
        }
        if (tok.t === 'op' && tok.v === ']') { pending.push(tok); i++; continue }
        if (tok.t === 'op') {
          const op = tok.v
          const args = pending
          pending = []
          const nums = args.filter(a => a.t === 'num').map(a => a.v)
          if (op === 'BT') { inText = true; tm = [1,0,0,1,0,0]; tl = [1,0,0,1,0,0] }
          else if (op === 'ET') { inText = false }
          else if (op === 'Tf' && args.length >= 2) { fontSize = args[0].v || 0 }
          else if (op === 'Td' && nums.length >= 2) { const [tx, ty] = nums; tl = [1,0,0,1, tl[4] + tx, tl[5] + ty]; tm = tl }
          else if (op === 'TD' && nums.length >= 2) { const [tx, ty] = nums; tl = [1,0,0,1, tl[4] + tx, tl[5] + ty]; tm = tl }
          else if (op === 'Tm' && nums.length >= 6) { tm = [...nums]; tl = [...nums] }
          else if (op === 'T*') { tl = [1,0,0,1, tl[4], tl[5] - (nums[0] !== undefined ? nums[0] : 0)]; tm = tl }
          else if (op === 'Tj' && args.length >= 1) {
            const sTok = args[args.length - 1]
            if (sTok.t === 'str') { const d = decodeText(sTok.v); if (d.text.trim()) items.push({ page: pageNum, x: Math.round(tm[4]), y: Math.round(tm[5]), size: Math.round(fontSize * 10) / 10, text: d.text, raw: d.printableRatio < 0.7 ? `<${Buffer.from(sTok.v).toString('hex')}>` : '' }) }
          }
          else if (op === "'" && args.length >= 1) {
            const sTok = args[args.length - 1]
            tl = [1,0,0,1, tl[4], tl[5] - fontSize]; tm = tl
            if (sTok.t === 'str') { const d = decodeText(sTok.v); if (d.text.trim()) items.push({ page: pageNum, x: Math.round(tm[4]), y: Math.round(tm[5]), size: Math.round(fontSize * 10) / 10, text: d.text, raw: d.printableRatio < 0.7 ? `<${Buffer.from(sTok.v).toString('hex')}>` : '' }) }
          }
          else if (op === 'TJ' && args.length >= 1) {
            const arrTok = args[args.length - 1]
            if (arrTok.t === 'op' && arrTok.v === '[') { /* handled in-line below */ }
          }
          i++; continue
        }
        i++
      }
    }
  } catch (e) {
    items.push({ page: pageNum, x: 0, y: 0, size: 0, text: `⚠️ erreur parse: ${e.message}`, raw: '' })
  }
  return items
}

for (let p = 0; p < pages.length; p++) {
  if (onlyPage && p + 1 !== onlyPage) continue
  const items = extractPage(pages[p], p + 1)
  console.log(`\n═══ PAGE ${p + 1} — ${items.length} texte(s) trouvé(s) ═══`)
  // Tri par Y décroissant (haut→bas) puis X croissant
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x))
  for (const it of items) {
    const info = it.raw ? `  [non-décodé: ${it.raw}]` : ''
    console.log(`  (x=${String(it.x).padStart(4)}, y=${String(it.y).padStart(4)}) taille=${String(it.size).padStart(5)}  « ${it.text} »${info}`)
  }
}
