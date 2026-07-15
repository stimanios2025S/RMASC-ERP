// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — PDF ELECTRONIC STAMP ENGINE (Cachet Électronique)
//  Overlays a professional industrial stamp onto PDF drawings upon approval.
//  Uses pdf-lib for pure-JS PDF manipulation (no native deps).
// ═══════════════════════════════════════════════════════════════════════════

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// ─── Stamp Layout Constants ────────────────────────────────────────────────
// All measurements in PDF points (1 pt = 1/72 inch). A4 = 595 × 842 pts.

const STAMP = {
  // ── Box geometry (bottom-right corner, 8mm margins from edge) ────────
  box: {
    x:          385,          // X offset from left (A4 width 595 - box W - margin)
    y:           60,          // Y offset from bottom
    width:      185,
    height:      82,
    cornerRadius: 4,
  },

  // ── Colors ─────────────────────────────────────────────────────────────
  colors: {
    border:     { r: 0.878, g: 0.180, b: 0.125 },  // Red #E02E20 — industrial stamp red
    background: { r: 0.996, g: 0.973, b: 0.945 },  // Warm off-white #FEF8F1
    header:     { r: 0.878, g: 0.180, b: 0.125 },  // Red same as border
    text:       { r: 0.067, g: 0.149, b: 0.278 },  // Dark slate #111A47
    accent:     { r: 0.067, g: 0.149, b: 0.278 },  // Same dark slate for secondary text
  },

  // ── Font sizes (pts) ───────────────────────────────────────────────────
  fontSize: {
    header:     10,    // "SARL RMASC — VISA TECHNIQUE"
    status:      9,    // "STATUT : APPROUVÉ POUR FABRICATION"
    approver:    8,    // "Par : [Admin Name]"
    timestamp:   7,    // "Le : DD/MM/YYYY à HH:MM"
  },
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Stamps a PDF file on disk with the RMASC electronic approval seal.
 * Mutates the file in-place (overwrites with stamped version).
 *
 * @param {string}  filePath     — Absolute path to the PDF on disk (e.g. backend/uploads/1712345678.pdf)
 * @param {object}  metadata     — Stamp content
 * @param {string}  metadata.approvedBy  — Name of the approving administrator
 * @param {Date}    metadata.approvedAt  — Date/time of approval
 * @param {string}  [metadata.serial]    — Optional order serial number for reference
 * @returns {Promise<{ success: boolean, filePath: string, pagesStamped: number, error?: string }>}
 */
export async function stampPdf(filePath, metadata = {}) {
  // ── Validate input ──────────────────────────────────────────────────────
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, filePath, pagesStamped: 0, error: `Fichier introuvable : ${filePath}` }
  }

  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.pdf') {
    return { success: false, filePath, pagesStamped: 0, error: `Format non supporté (${ext}). Seuls les PDF sont acceptés.` }
  }

  try {
    // ── 1. Read & parse the PDF ──────────────────────────────────────────
    const pdfBytes = fs.readFileSync(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    // ── 2. Embed fonts ────────────────────────────────────────────────────
    const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontLight  = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // ── 3. Build text strings ─────────────────────────────────────────────
    const dateStr = metadata.approvedAt
      ? new Date(metadata.approvedAt).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : new Date().toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })

    const approvedBy = metadata.approvedBy || 'Administrateur RMASC'
    const serial     = metadata.serial || ''

    // ── 4. Draw stamp on every page ───────────────────────────────────────
    for (const page of pages) {
      const { width: pageW, height: pageH } = page.getSize()

      // Adapt X position for different page widths
      const boxX = pageW - STAMP.box.width - 22  // 22pt ≈ 8mm right margin

      // ── Draw background rectangle (opaque white) ────────────────────────
      page.drawRectangle({
        x: boxX,
        y: STAMP.box.y,
        width:  STAMP.box.width,
        height: STAMP.box.height,
        color:  rgb(STAMP.colors.background.r, STAMP.colors.background.g, STAMP.colors.background.b),
        borderColor: rgb(STAMP.colors.border.r, STAMP.colors.border.g, STAMP.colors.border.b),
        borderWidth: 1.5,
        opacity: 0.97,
      })

      // ── Draw top accent bar (red strip) ─────────────────────────────────
      page.drawRectangle({
        x: boxX + 1.5,
        y: STAMP.box.y + STAMP.box.height - 6,
        width:  STAMP.box.width - 3,
        height: 3,
        color:  rgb(STAMP.colors.border.r, STAMP.colors.border.g, STAMP.colors.border.b),
      })

      // ── Draw text lines ─────────────────────────────────────────────────
      const cx = boxX + STAMP.box.width / 2    // horizontal center
      const textX = boxX + 10                  // left-aligned with padding
      const textMaxWidth = STAMP.box.width - 20

      // Line 1: "SARL RMASC — VISA TECHNIQUE" (bold, centered)
      const headerText = 'SARL RMASC — VISA TECHNIQUE'
      const headerWidth = fontBold.widthOfTextAtSize(headerText, STAMP.fontSize.header)
      page.drawText(headerText, {
        x: cx - headerWidth / 2,
        y: STAMP.box.y + STAMP.box.height - 24,
        size: STAMP.fontSize.header,
        font: fontBold,
        color: rgb(STAMP.colors.header.r, STAMP.colors.header.g, STAMP.colors.header.b),
      })

      // Line 2: "STATUT : APPROUVÉ POUR FABRICATION" (bold)
      const statusText = 'STATUT : APPROUVÉ POUR FABRICATION'
      page.drawText(statusText, {
        x: textX,
        y: STAMP.box.y + STAMP.box.height - 41,
        size: STAMP.fontSize.status,
        font: fontBold,
        color: rgb(STAMP.colors.text.r, STAMP.colors.text.g, STAMP.colors.text.b),
      })

      // Line 3: "Par : [Admin Name]" (normal)
      const approverText = `Par : ${approvedBy}`
      page.drawText(approverText, {
        x: textX,
        y: STAMP.box.y + STAMP.box.height - 55,
        size: STAMP.fontSize.approver,
        font: fontNormal,
        color: rgb(STAMP.colors.text.r, STAMP.colors.text.g, STAMP.colors.text.b),
        maxWidth: textMaxWidth,
      })

      // Line 3b: Serial number reference (small, right-aligned)
      if (serial) {
        const serialText = `Réf : ${serial}`
        const serialWidth = fontLight.widthOfTextAtSize(serialText, STAMP.fontSize.timestamp)
        page.drawText(serialText, {
          x: boxX + STAMP.box.width - serialWidth - 10,
          y: STAMP.box.y + STAMP.box.height - 55,
          size: STAMP.fontSize.timestamp,
          font: fontLight,
          color: rgb(STAMP.colors.accent.r * 0.6, STAMP.colors.accent.g * 0.6, STAMP.colors.accent.b * 0.6),
        })
      }

      // Line 4: "Le : DD/MM/YYYY à HH:MM" (light)
      page.drawText(`Le : ${dateStr}`, {
        x: textX,
        y: STAMP.box.y + STAMP.box.height - 67,
        size: STAMP.fontSize.timestamp,
        font: fontLight,
        color: rgb(STAMP.colors.accent.r * 0.6, STAMP.colors.accent.g * 0.6, STAMP.colors.accent.b * 0.6),
      })

      // ── Small RMASC watermark (tiny italic, bottom-right inside box) ─────
      const watermarkText = 'RMASC ERP'
      const watermarkW = fontLight.widthOfTextAtSize(watermarkText, 6)
      page.drawText(watermarkText, {
        x: boxX + STAMP.box.width - watermarkW - 8,
        y: STAMP.box.y + 8,
        size: 6,
        font: fontLight,
        color: rgb(0.65, 0.65, 0.65),
      })
    }

    // ── 5. Save modified PDF back to disk (overwrite) ────────────────────
    const stampedBytes = await pdfDoc.save()
    fs.writeFileSync(filePath, stampedBytes)

    console.log(`  🏷️  [PDF STAMPER] ${pages.length} page(s) stamped → ${path.basename(filePath)}`)
    console.log(`       Approuvé par : ${approvedBy}  |  ${dateStr}`)

    return {
      success: true,
      filePath,
      pagesStamped: pages.length,
      stampedAt: new Date().toISOString(),
      stampedBy: approvedBy,
    }

  } catch (err) {
    console.error(`  ❌ [PDF STAMPER] Échec : ${err.message}`)
    return {
      success: false,
      filePath,
      pagesStamped: 0,
      error: err.message,
    }
  }
}

/**
 * Batch stamps all PDF files associated with an order.
 * Walks through the order's `files` array and stamps each .pdf.
 *
 * @param {object} order  — Mongoose Order document with `files` subdoc array
 * @param {object} meta   — { approvedBy, approvedAt, serial }
 * @returns {Promise<{ total: number, stamped: number, failed: number, results: object[] }>}
 */
export async function stampOrderFiles(order, meta = {}) {
  const results = []
  let stamped = 0
  let failed  = 0

  const pdfFiles = (order.files || []).filter(f =>
    f.mimetype === 'application/pdf' ||
    (f.originalname && f.originalname.toLowerCase().endsWith('.pdf'))
  )

  console.log(`\n  🏷️  [PDF STAMPER] Commande : ${meta.serial || order.serialNumber}`)
  console.log(`       ${pdfFiles.length} fichier(s) PDF trouvé(s) sur ${order.files?.length || 0} fichier(s) total.\n`)

  for (const file of pdfFiles) {
    const res = await stampPdf(file.path, {
      approvedBy: meta.approvedBy || 'Administrateur',
      approvedAt: meta.approvedAt || new Date(),
      serial:     meta.serial || order.serialNumber,
    })

    results.push({
      fileId:   file._id,
      filename: file.originalname,
      ...res,
    })

    if (res.success) stamped++
    else failed++
  }

  return { total: pdfFiles.length, stamped, failed, results }
}
