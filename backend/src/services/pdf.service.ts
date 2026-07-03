// ─── PDF Generation Service — Fiche Technique Ascenseur ─────────────────────
import PDFDocument from 'pdfkit'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STORAGE_DIR = path.resolve(__dirname, '../../public/documents/fiches')

export interface PdfOrderData {
  serialNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
  clientCity: string
  typeMotorisation: string
  sousTypeElectrique: string | null
  vitesseMs: string | null
  nombreEtages: string | null
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  materiauCabine: string | null
  materiauPortes: string | null
  materiauParois: string | null
  materiauSol: string | null
  // ── Mekisan Catalog fields
  typeCabine: string | null
  typePorte: string | null
  finitionPorteCabine: string | null
  typeChassisArcade: string | null
  finitionInterieurCabine: string | null
  revetementSol: string | null
  largeurPassageLibreMm: string | null
  hauteurUtileCabineMm: string | null
  typeSuspensionGuidage: string | null
  systemeSurcharge: string | null
  optPanoramique: boolean
  optSecours: boolean
  optAnnoncesVocales: boolean
  optCctv: boolean
  optPortesCoupeFeu: boolean
  optPanneauTactile: boolean
}

// ─── Colour constants (RMASC Blue & Orange theme) ──────────────────────────
const BLUE_DARK = '#1e3a8a'
const BLUE_MID = '#2563eb'
const ORANGE = '#ea580c'
const ORANGE_LIGHT = '#fff7ed'
const GRAY_100 = '#f3f4f6'
const GRAY_300 = '#d1d5db'
const GRAY_600 = '#4b5563'
const GRAY_800 = '#1f2937'
const RED_STAMP = '#dc2626'

// ─── Ensure storage directory exists ───────────────────────────────────────
function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
}

// ─── Generate the Fiche Technique PDF ─────────────────────────────────────
export async function generateFicheTechnique(data: PdfOrderData): Promise<{ filePath: string; fileName: string }> {
  ensureStorageDir()

  const sanitized = data.serialNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `fiche_technique_${sanitized}.pdf`
  const filePath = path.join(STORAGE_DIR, fileName)

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Fiche Technique - ${data.serialNumber}`,
          Author: 'RMASC ERP',
          Subject: `Ascenseur - ${data.serialNumber}`,
        },
      })

      const stream = fs.createWriteStream(filePath)
      doc.pipe(stream)

      // ── Helper: draw a table row ─────────────────────────────────────
      function tableRow(y: number, label: string, value: string, opts?: { bold?: boolean; highlight?: boolean }): number {
        const rowH = 22
        if (opts?.highlight) {
          doc.rect(50, y, 495, rowH).fill(ORANGE_LIGHT)
        }
        doc.fillColor(GRAY_600).fontSize(9).font('Helvetica')
        doc.text(label, 60, y + 6, { width: 180, lineBreak: false })
        doc.fillColor(GRAY_800).font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
        doc.text(value || '—', 240, y + 6, { width: 290, lineBreak: false })
        return y + rowH
      }

      function sectionHeader(y: number, title: string): number {
        doc.rect(50, y, 495, 26).fill(BLUE_DARK)
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        doc.text(title, 60, y + 8, { width: 470 })
        return y + 26
      }

      function sectionDivider(y: number): number {
        doc.strokeColor(GRAY_300).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke()
        return y + 4
      }

      // ── Helper: format enum labels (replace underscores, title case) ──
      function formatEnumLabel(val: string | null | undefined): string {
        if (!val) return '—'
        return val
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      }

      // ══════════════════════════════════════════════════════════════════
      // 1. HEADER SECTION
      // ══════════════════════════════════════════════════════════════════
      let y = 40

      // RMASC logo / title block
      doc.rect(50, y, 495, 60).fill(BLUE_DARK)
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      doc.text('RMASC', 60, y + 12, { width: 200 })
      doc.fillColor(ORANGE).fontSize(10).font('Helvetica')
      doc.text('FICHE TECHNIQUE ASCENSEUR', 60, y + 38, { width: 200 })

      // Serial number badge (right side)
      doc.rect(380, y + 10, 155, 40).fillColor('#ffffff').fill()
      doc.fillColor(BLUE_DARK).fontSize(8).font('Helvetica-Bold')
      doc.text('NUMÉRO DE SÉRIE', 388, y + 16, { width: 140, align: 'center' })
      doc.fillColor(ORANGE).fontSize(13).font('Helvetica-Bold')
      doc.text(data.serialNumber, 388, y + 28, { width: 140, align: 'center' })

      y += 80

      // Date
      doc.fillColor(GRAY_600).fontSize(8).font('Helvetica')
      const today = new Date()
      const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.text(`Date d'émission : ${dateStr}`, 50, y, { width: 300 })
      y += 20

      y = sectionDivider(y)

      // ══════════════════════════════════════════════════════════════════
      // 2. CLIENT INFO
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '1. INFORMATIONS CLIENT')
      y = tableRow(y, 'Nom du client', data.clientName, { bold: true })
      y = tableRow(y, 'Email', data.clientEmail || '(Optionnel — non renseigné)')
      y = tableRow(y, 'Téléphone', data.clientPhone)
      y = tableRow(y, 'Ville', data.clientCity, { highlight: true })
      y += 6

      // ══════════════════════════════════════════════════════════════════
      // 3. MOTORISATION
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '2. MOTORISATION')
      y = tableRow(y, 'Type de motorisation', data.typeMotorisation, { bold: true })
      y = tableRow(y, 'Sous-type', data.sousTypeElectrique || '—')
      y = tableRow(y, 'Vitesse', data.vitesseMs ? `${data.vitesseMs} m/s` : '—')
      y = tableRow(y, "Nombre d'étages", data.nombreEtages || '—', { highlight: true })
      y += 6

      // ══════════════════════════════════════════════════════════════════
      // 4. DIMENSIONS
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '3. DIMENSIONS (GAINE TECHNIQUE)')
      y = tableRow(y, 'Largeur gaine', `${data.largeurGaineMm} mm`, { bold: true })
      y = tableRow(y, 'Profondeur gaine', `${data.profondeurGaineMm} mm`)
      y = tableRow(y, 'Hauteur de la gaine', `${data.hauteurGaineMm} mm`, { highlight: true })
      y += 6

      // ══════════════════════════════════════════════════════════════════
      // 5. MATÉRIAUX & FINITIONS
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '4. MATÉRIAUX & FINITIONS')
      y = tableRow(y, 'Matériau cabine', data.materiauCabine || '—', { bold: true })
      y = tableRow(y, 'Matériau portes', data.materiauPortes || '—')
      y = tableRow(y, 'Finition portes cabine', formatEnumLabel(data.finitionPorteCabine), { highlight: true })
      y = tableRow(y, 'Finition intérieur cabine', formatEnumLabel(data.finitionInterieurCabine), { bold: true })
      y = tableRow(y, 'Matériau parois', data.materiauParois || '—')
      y = tableRow(y, 'Revêtement de sol', formatEnumLabel(data.revetementSol), { highlight: true })
      y = tableRow(y, 'Matériau sol', data.materiauSol || '—')
      y += 6

      // ══════════════════════════════════════════════════════════════════
      // 6. COMPOSANTS MÉCANIQUES SPÉCIFIQUES
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '5. COMPOSANTS MÉCANIQUES SPÉCIFIQUES')
      y = tableRow(y, 'Type de cabine', formatEnumLabel(data.typeCabine), { bold: true })
      y = tableRow(y, 'Type de châssis / arcade', formatEnumLabel(data.typeChassisArcade), { bold: true })
      y = tableRow(y, 'Type de portes palières', formatEnumLabel(data.typePorte), { highlight: true })
      y += 4
      y = tableRow(y, 'Largeur de passage libre', data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '—', { bold: true })
      y = tableRow(y, 'Hauteur utile cabine', data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '—')
      y += 4
      y = tableRow(y, 'Type suspension / guidage', formatEnumLabel(data.typeSuspensionGuidage), { bold: true })
      y = tableRow(y, 'Système de surcharge', formatEnumLabel(data.systemeSurcharge), { highlight: true })
      y += 6

      // ══════════════════════════════════════════════════════════════════
      // 7. OPTIONS (checklist)
      // ══════════════════════════════════════════════════════════════════
      y = sectionHeader(y, '6. OPTIONS')

      const options: { label: string; active: boolean }[] = [
        { label: 'Ascenseur panoramique', active: data.optPanoramique },
        { label: 'Alimentation de secours', active: data.optSecours },
        { label: 'Annonces vocales', active: data.optAnnoncesVocales },
        { label: 'CCTV intégré', active: data.optCctv },
        { label: 'Portes coupe-feu', active: data.optPortesCoupeFeu },
        { label: 'Panneau tactile', active: data.optPanneauTactile },
      ]

      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        const rowH = 20
        const isEven = i % 2 === 0
        if (!isEven) {
          doc.rect(50, y, 495, rowH).fill(GRAY_100)
        }

        // Checkbox symbol
        doc.fillColor(opt.active ? BLUE_MID : GRAY_300).fontSize(11).font('Helvetica')
        doc.text(opt.active ? '☑' : '☐', 60, y + 4, { width: 20 })
        doc.fillColor(GRAY_800).fontSize(9).font('Helvetica')
        doc.text(opt.label, 85, y + 4, { width: 300 })

        doc.fillColor(opt.active ? BLUE_MID : GRAY_300).fontSize(7).font('Helvetica-Oblique')
        doc.text(opt.active ? 'Inclus' : 'Non inclus', 400, y + 4, { width: 100 })
        y += rowH
      }
      y += 10

      // ══════════════════════════════════════════════════════════════════
      // 7. VALIDATION STAMP AREA
      // ══════════════════════════════════════════════════════════════════
      y = sectionDivider(y)
      y += 10

      // Stamp / signature box
      doc.rect(50, y, 495, 80).fillColor('#fef2f2').fill()
      doc.rect(50, y, 495, 80).lineWidth(2).strokeColor(RED_STAMP).stroke()

      // Diagonal stamp text effect
      doc.fillColor(RED_STAMP).fontSize(18).font('Helvetica-Bold')
      const stampText = 'COMMANDE VALIDÉE'
      const stampOpts = { width: 300, align: 'center' as const }
      doc.text(stampText, 170, y + 12, stampOpts)

      doc.fontSize(11).font('Helvetica')
      doc.text('Direction RMASC', 170, y + 36, stampOpts)
      doc.fontSize(8).font('Helvetica-Oblique')
      doc.text(`Validé le ${dateStr}`, 170, y + 54, stampOpts)
      doc.text(`N° ${data.serialNumber}`, 170, y + 68, stampOpts)

      // Footer
      y += 100
      doc.fillColor(GRAY_600).fontSize(7).font('Helvetica')
      doc.text('Document généré automatiquement par RMASC ERP — Bureau d\'étude intégré', 50, y, { width: 495, align: 'center' })
      doc.text(`Page 1/1 — ${dateStr}`, 50, y + 12, { width: 495, align: 'center' })

      // Finalize
      doc.end()

      stream.on('finish', () => {
        resolve({ filePath, fileName })
      })
      stream.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}
