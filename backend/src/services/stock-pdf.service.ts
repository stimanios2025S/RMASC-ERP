// ─── Stock PDF Service — Movement PDFs + Bon de Commande ────────────────
import PDFDocument from 'pdfkit'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STORAGE_DIR = path.resolve(__dirname, '../../public/documents/stock')

function ensureDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// ═══════════════════════════════════════════════════════════════════════════
//  MOVEMENT PDF
// ═══════════════════════════════════════════════════════════════════════════

function typeLabel(t: string): string {
  return { ENTRY: 'ENTRÉE EN STOCK', EXIT: 'SORTIE DE STOCK', ADJUSTMENT: 'AJUSTEMENT', TRANSFER: 'TRANSFERT' }[t] || t
}

export async function generateMovementPdf(data: {
  movementId: string; type: string; quantity: number; unitPrice: number | null; totalPrice: number | null
  reference: string | null; notes: string | null; performedBy: string | null; createdAt: string
  itemName: string; itemReference: string; itemCategory: string; itemUnit: string; itemQuantity: number
  supplierName: string | null; orderSerial: string | null
}): Promise<{ filePath: string; fileName: string }> {
  ensureDir()
  const suffix = { ENTRY: 'entree', EXIT: 'sortie', ADJUSTMENT: 'ajustement', TRANSFER: 'transfert' }[data.type] || 'mouvement'
  const ref = data.reference || data.movementId.slice(0, 8).toUpperCase()
  const fileName = `stock_${suffix}_${data.movementId.slice(0, 8)}.pdf`
  const filePath = path.join(STORAGE_DIR, fileName)
  const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR')

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: { Title: `${typeLabel(data.type)} - ${data.itemName}`, Author: 'RMASC ERP' } })
      const stream = fs.createWriteStream(filePath); doc.pipe(stream)
      const C = '#0e7490', T = '#0d9488', G1 = '#f1f5f9', G3 = '#cbd5e1', G6 = '#475569', G8 = '#1e293b'
      const row = (y: number, l: string, v: string, o?: { b?: boolean; bg?: boolean }) => { const h = 22; if (o?.bg) doc.rect(50, y, 495, h).fill(G1); doc.fillColor(G6).fontSize(9).font('Helvetica').text(l, 60, y + 6, { width: 180 }); doc.fillColor(G8).font(o?.b ? 'Helvetica-Bold' : 'Helvetica').text(v || '—', 240, y + 6, { width: 290 }); return y + h }
      const sec = (y: number, t: string) => { doc.rect(50, y, 495, 26).fill(C); doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold').text(t, 60, y + 8); return y + 26 }
      let y = 40
      doc.rect(50, y, 495, 55).fill(T)
      doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('RMASC', 60, y + 10)
      doc.fontSize(9).font('Helvetica').text('GESTION DES STOCKS', 60, y + 36)
      doc.fontSize(14).font('Helvetica-Bold').text(typeLabel(data.type), 280, y + 14, { width: 250, align: 'right' })
      doc.fontSize(8).font('Helvetica').text(`N° ${ref}`, 280, y + 34, { width: 250, align: 'right' })
      y += 75
      y = sec(y, '1. INFORMATIONS GÉNÉRALES')
      y = row(y, 'Date', dateStr, { b: true, bg: true }); y = row(y, 'Type', typeLabel(data.type))
      y = row(y, 'Référence', ref, { bg: true }); y = row(y, 'Effectué par', data.performedBy || '—')
      y = row(y, 'Notes', data.notes || '—', { bg: true }); y += 8
      y = sec(y, '2. ARTICLE')
      y = row(y, 'Nom', data.itemName, { b: true, bg: true }); y = row(y, 'Référence', data.itemReference)
      y = row(y, 'Catégorie', data.itemCategory, { bg: true }); y = row(y, 'Unité', data.itemUnit)
      y = row(y, 'Stock après mouvement', `${data.itemQuantity} ${data.itemUnit}`, { b: true, bg: true }); y += 8
      y = sec(y, '3. QUANTITÉS & PRIX')
      y = row(y, 'Quantité', `${data.type === 'ENTRY' ? '+' : '-'}${data.quantity} ${data.itemUnit}`, { b: true, bg: true })
      if (data.unitPrice != null) y = row(y, 'Prix unitaire', `${data.unitPrice.toLocaleString()} DA`)
      if (data.totalPrice != null) y = row(y, 'Total', `${data.totalPrice.toLocaleString()} DA`, { b: true, bg: true })
      if (data.supplierName) y = row(y, 'Fournisseur', data.supplierName)
      y += 8
      y = sec(y, '4. SIGNATURES')
      doc.rect(50, y, 495, 70).fillColor('#f8fafc').fill(); doc.rect(50, y, 495, 70).lineWidth(1).strokeColor(G3).stroke()
      doc.fillColor(G6).fontSize(9).font('Helvetica').text('Responsable magasin', 70, y + 12).text('Date :', 70, y + 36).text('Cachet :', 70, y + 50)
      doc.fillColor(G3).fontSize(7).font('Helvetica-Oblique').text('Document généré par RMASC FACTORY', 200, y + 56, { width: 330, align: 'right' })
      y += 90; doc.fillColor(G6).fontSize(7).font('Helvetica').text(`Document émis le ${dateStr}`, 50, y, { width: 495, align: 'center' })
      doc.end()
      stream.on('finish', () => resolve({ filePath, fileName })); stream.on('error', reject)
    } catch (err) { reject(err) }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  BON DE COMMANDE PDF
// ═══════════════════════════════════════════════════════════════════════════

export interface BonCommandeLineData {
  itemName: string; itemReference: string; quantity: number
  unitPrice: number | null; totalPrice: number | null
}

export interface BonCommandeData {
  documentNumber: string; title: string; description: string | null; createdAt: string
  supplierName: string | null; supplierContact: string | null; supplierPhone: string | null; supplierEmail: string | null
  totalHT: number | null; totalTVA: number | null; totalTTC: number | null
  lines: BonCommandeLineData[]; createdBy: string | null
}

export async function generateBonCommandePdf(data: BonCommandeData): Promise<{ filePath: string; fileName: string }> {
  ensureDir()
  const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const fileName = `bon_commande_${data.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  const filePath = path.join(STORAGE_DIR, fileName)

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: { Title: `Bon de Commande ${data.documentNumber}`, Author: 'RMASC ERP' } })
      const stream = fs.createWriteStream(filePath); doc.pipe(stream)
      const B = '#0e7490', T = '#0d9488', G1 = '#f1f5f9', G3 = '#cbd5e1', G6 = '#475569', G8 = '#1e293b'
      const sec = (y: number, t: string) => { doc.rect(50, y, 495, 26).fill(B); doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold').text(t, 60, y + 8); return y + 26 }
      const f = (y: number, l: string, v: string, o?: { b?: boolean; bg?: boolean }) => { const h = 20; if (o?.bg) doc.rect(50, y, 495, h).fill(G1); doc.fillColor(G6).fontSize(9).font('Helvetica').text(l, 60, y + 5, { width: 160 }); doc.fillColor(G8).font(o?.b ? 'Helvetica-Bold' : 'Helvetica').text(v || '—', 220, y + 5, { width: 310 }); return y + h }
      let y = 40
      doc.rect(50, y, 495, 60).fill(T)
      doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('RMASC', 60, y + 10)
      doc.fontSize(8).font('Helvetica').text('FACTORY — Gestion des Stocks', 60, y + 38)
      doc.fillColor('#fef3c7').fontSize(14).font('Helvetica-Bold').text('BON DE COMMANDE', 280, y + 10, { width: 250, align: 'right' })
      doc.fontSize(9).font('Helvetica').text(`N° ${data.documentNumber}`, 280, y + 30, { width: 250, align: 'right' })
      doc.fillColor('#fff').fontSize(8).font('Helvetica').text(`Émis le ${dateStr}`, 280, y + 44, { width: 250, align: 'right' })
      y += 80
      y = sec(y, '1. FOURNISSEUR')
      y = f(y, 'Raison sociale', data.supplierName || '—', { b: true, bg: true })
      if (data.supplierContact) y = f(y, 'Contact', data.supplierContact)
      if (data.supplierPhone) y = f(y, 'Téléphone', data.supplierPhone, { bg: true })
      if (data.supplierEmail) y = f(y, 'Email', data.supplierEmail)
      y = f(y, 'Créé par', data.createdBy || '—', { bg: true }); y += 8
      if (data.description) { y = sec(y, '2. DESCRIPTION'); doc.fillColor(G8).fontSize(9).font('Helvetica').text(data.description, 60, y + 8, { width: 470 }); y += 28 }
      y = sec(y, data.description ? '3. LIGNES DE COMMANDE' : '2. LIGNES DE COMMANDE')
      doc.rect(50, y, 495, 22).fill(B); doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
      doc.text('Réf.', 60, y + 6, { width: 70 }); doc.text('Article', 135, y + 6, { width: 150 })
      doc.text('Qté', 290, y + 6, { width: 50, align: 'right' }); doc.text('P/U', 340, y + 6, { width: 80, align: 'right' })
      doc.text('Total', 430, y + 6, { width: 100, align: 'right' }); y += 22
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i]; if (i % 2 === 0) doc.rect(50, y, 495, 22).fill(G1)
        doc.fillColor(G8).fontSize(8).font('Helvetica').text(l.itemReference, 60, y + 6, { width: 70 })
        doc.font('Helvetica-Bold').text(l.itemName, 135, y + 6, { width: 150 })
        doc.text(String(l.quantity), 290, y + 6, { width: 50, align: 'right' })
        doc.text(l.unitPrice ? `${l.unitPrice.toLocaleString()} DA` : '—', 340, y + 6, { width: 80, align: 'right' })
        doc.font('Helvetica-Bold').text(l.totalPrice ? `${l.totalPrice.toLocaleString()} DA` : '—', 430, y + 6, { width: 100, align: 'right' })
        y += 22
      }
      doc.rect(50, y, 495, 26).fill(T); doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
      doc.text('TOTAL TTC', 60, y + 7, { width: 200 }); doc.text(`${data.totalTTC?.toLocaleString() || '0'} DA`, 290, y + 7, { width: 240, align: 'right' }); y += 36
      y = sec(y, '4. SIGNATURES')
      doc.rect(50, y, 495, 70).fillColor('#f8fafc').fill(); doc.rect(50, y, 495, 70).lineWidth(1).strokeColor(G3).stroke()
      doc.fillColor(G6).fontSize(9).font('Helvetica').text('Le magasinier', 70, y + 12).text(`Date : ${dateStr}`, 70, y + 36).text('Cachet fournisseur :', 70, y + 50)
      doc.fillColor(G3).fontSize(7).font('Helvetica-Oblique').text('Document généré par RMASC FACTORY', 200, y + 56, { width: 330, align: 'right' })
      y += 90; doc.fillColor(G6).fontSize(7).font('Helvetica').text(`RMASC FACTORY — ${fileName}`, 50, y, { width: 495, align: 'center' })
      doc.end()
      stream.on('finish', () => resolve({ filePath, fileName })); stream.on('error', reject)
    } catch (err) { reject(err) }
  })
}
