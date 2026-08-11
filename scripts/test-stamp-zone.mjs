// ─── TEST : tamponne un PDF avec la logique ZONE SIGNATURE ────────────────
// Usage: node scripts/test-stamp-zone.mjs "<pdf à tamponner>" "<cachet.png>"
import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

const inputPdf = process.argv[2]
const stampPng = process.argv[3] || 'public/cachet.png.png'
const outputPdf = process.argv[4] || 'scripts/test-stamped.pdf'

const STAMP_ZONE = { leftPct: 0.62, bottomPct: 0.015, widthPct: 0.36, heightPct: 0.16 }

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

  // Cachet TOUJOURS HORIZONTAL (rotation -90° vers la DROITE si image verticale)
  const rawW = stampImage.width
  const rawH = stampImage.height
  const isPortrait = rawH > rawW
  const scale = isPortrait
    ? Math.min(zoneW / rawH, zoneH / rawW)
    : Math.min(zoneW / rawW, zoneH / rawH)

  const pw = rawW * scale
  const ph = rawH * scale
  const visW = isPortrait ? ph : pw
  const visH = isPortrait ? pw : ph

  let x, y, visRight, visTop
  if (isPortrait) {
    // boîte visuelle : [x, x + visW] × [y - visH, y]
    x = zoneX + (zoneW - visW) / 2
    y = zoneY + (zoneH + visH) / 2
    visRight = x + visW
    visTop = y
    page.drawImage(stampImage, { x, y, width: pw, height: ph, rotate: degrees(-90) })
  } else {
    x = zoneX + (zoneW - visW) / 2
    y = zoneY + (zoneH - visH) / 2
    visRight = x + visW
    visTop = y + visH
    page.drawImage(stampImage, { x, y, width: pw, height: ph })
  }

  const label = `APPROUVÉ — Test — ${new Date().toLocaleDateString('fr-FR')}`
  const labelWidth = font.widthOfTextAtSize(label, 7)
  page.drawText(label, {
    x: Math.max(0, visRight - labelWidth),
    y: Math.min(visTop + 8, height - 10),
    size: 7, font, color: rgb(0.8, 0.12, 0.12),
  })

  console.log(`Page ${width.toFixed(0)}x${height.toFixed(0)}pt — cachet source ${rawW}x${rawH} (${isPortrait ? 'portrait → ROTATION -90° (droite)' : 'déjà paysage'})`)
  console.log(`  Zone signature : x=${zoneX.toFixed(1)} y=${zoneY.toFixed(1)} w=${zoneW.toFixed(1)} h=${zoneH.toFixed(1)}`)
  console.log(`  Cachet VISUEL  : x=${x.toFixed(1)} y=${(isPortrait ? y - visH : y).toFixed(1)} w=${visW.toFixed(1)} h=${visH.toFixed(1)} (HORIZONTAL)`)
  console.log(`  Étiquette      : y=${(visTop + 8).toFixed(1)}, alignée droite du cachet`)
}

const outBytes = await pdfDoc.save()
fs.writeFileSync(outputPdf, outBytes)
console.log(`\n✅ PDF tamponné → ${outputPdf} (${(outBytes.length / 1024).toFixed(0)} Ko)`)
