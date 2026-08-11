// ─── TEST : tamponne un PDF avec la logique ZONE SIGNATURE ────────────────
// Usage: node scripts/test-stamp-zone.mjs "<pdf à tamponner>" "<cachet.png>"
import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const inputPdf = process.argv[2]
const stampPng = process.argv[3] || 'public/cachet.png.png'
const outputPdf = process.argv[4] || 'scripts/test-stamped.pdf'

const STAMP_ZONE = { leftPct: 0.58, bottomPct: 0.06, widthPct: 0.37, heightPct: 0.17 }

const pdfBytes = fs.readFileSync(inputPdf)
const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

const stampBytes = fs.readFileSync(stampPng)
const stampImage = await pdfDoc.embedPng(stampBytes)
const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
const pages = pdfDoc.getPages()

for (const page of pages) {
  const { width, height } = page.getSize()
  const zoneX = STAMP_ZONE.leftPct * width
  const zoneY = STAMP_ZONE.bottomPct * height
  const zoneW = STAMP_ZONE.widthPct * width
  const zoneH = STAMP_ZONE.heightPct * height

  const aspect = stampImage.height / stampImage.width
  const w = Math.min(zoneW, zoneH / aspect)
  const h = w * aspect
  const x = zoneX + (zoneW - w) / 2
  const y = zoneY + (zoneH - h) / 2

  page.drawImage(stampImage, { x, y, width: w, height: h })

  const label = `APPROUVÉ — Test — ${new Date().toLocaleDateString('fr-FR')}`
  const labelWidth = font.widthOfTextAtSize(label, 7)
  page.drawText(label, {
    x: Math.max(0, zoneX + zoneW - labelWidth),
    y: Math.min(zoneY + zoneH + 8, height - 10),
    size: 7, font, color: rgb(0.8, 0.12, 0.12),
  })

  console.log(`Page ${width.toFixed(0)}x${height.toFixed(0)}pt`)
  console.log(`  Zone signature : x=${zoneX.toFixed(1)} y=${zoneY.toFixed(1)} w=${zoneW.toFixed(1)} h=${zoneH.toFixed(1)}`)
  console.log(`  Cachet posé    : x=${x.toFixed(1)} y=${y.toFixed(1)} w=${w.toFixed(1)} h=${h.toFixed(1)}  (cachet ${stampImage.width}x${stampImage.height})`)
  console.log(`  Étiquette      : y=${(zoneY + zoneH + 8).toFixed(1)} (coin haut-droit zone, justifiée à droite)`)
}

const outBytes = await pdfDoc.save()
fs.writeFileSync(outputPdf, outBytes)
console.log(`\n✅ PDF tamponné → ${outputPdf} (${(outBytes.length / 1024).toFixed(0)} Ko)`)
