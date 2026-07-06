import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../config/api'

interface CADSubmission {
  id: string; engineeringType: string; engineerName: string; status: string
  approvedAt: string | null; rejectionReason: string | null; approvalToken: string | null
}

interface OrderFull {
  id: string; serialNumber: string; clientName: string; notes?: string | null
  clientEmail: string | null; clientPhone: string; clientCity: string
  status: string; typeMotorisation: string
  sousTypeElectrique: string | null; vitesseMs: string | null; nombreEtages: string | null
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  profondeurCuvetteMm?: string | null; hauteurDernierEtageMm?: string | null
  largeurCabineCalculeeMm?: string | null; profondeurCabineCalculeeMm?: string | null
  contrepoidsPosition?: string | null; positionContrepoids?: string | null
  materiauCabine: string | null; materiauPortes: string | null
  materiauParois: string | null; materiauSol: string | null
  typeCabine: string | null; typePorte: string | null
  finitionPorteCabine: string | null; typeChassisArcade: string | null
  finitionInterieurCabine: string | null; revetementSol: string | null
  largeurPassageLibreMm: string | null; hauteurUtileCabineMm: string | null
  typeSuspensionGuidage: string | null; systemeSurcharge: string | null
  optPanoramique: boolean; optSecours: boolean; optAnnoncesVocales: boolean
  optCctv: boolean; optPortesCoupeFeu: boolean; optPanneauTactile: boolean
  createdAt: string; cadSubmissions: CADSubmission[]
}

function statusLabel(s: string): string {
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Attente Plan Installation',
    ATTENTE_APPROBATION_ADMIN: 'Approbation Admin', ATTENTE_DESSIN_2D: 'Attente Dessin 2D',
    ATTENTE_VERIFICATION: 'Vérification Finale', PRET_POUR_PRODUCTION: 'Prêt Production',
    EN_LIVRAISON: 'En Livraison', LIVREE: 'Livrée',
    VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }
  return labels[s] || s
}

function fmt(val: string | null | undefined): string {
  if (!val) return '—'
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function optsList(d: OrderFull): string[] {
  const o: string[] = []
  if (d.optPanoramique) o.push('Ascenseur panoramique')
  if (d.optSecours) o.push('Alimentation de secours')
  if (d.optAnnoncesVocales) o.push('Annonces vocales')
  if (d.optCctv) o.push('CCTV intégré')
  if (d.optPortesCoupeFeu) o.push('Portes coupe-feu')
  if (d.optPanneauTactile) o.push('Panneau tactile')
  return o
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Styles for the fiche document ────────────────────────────────────────
const FICHE_STYLES = `
.fiche-document { font-family: 'Arial', 'Helvetica', sans-serif; color: #1f2937; max-width: 190mm; margin: 0 auto; }
.fiche-header { width: 100%; border-collapse: collapse; background: #1e3a8a; color: white; border-radius: 6px 6px 0 0; overflow: hidden; }
.fiche-header-brand { padding: 12px 16px; width: 60%; }
.fiche-title { font-size: 22px; font-weight: 800; color: #f59e0b; }
.fiche-orange { color: #ea580c; }
.fiche-subtitle { font-size: 10px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
.fiche-header-serial { padding: 12px 16px; text-align: right; }
.fiche-serial-label { font-size: 8px; font-weight: bold; letter-spacing: 1px; }
.fiche-serial-value { font-size: 14px; font-weight: bold; color: #f59e0b; }
.fiche-date { font-size: 9px; color: #64748b; margin: 8px 0 4px 0; }
.fiche-section { background: #1e3a8a; color: white; font-size: 10px; font-weight: bold; padding: 6px 12px; margin: 10px 0 6px 0; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; }
.fiche-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 4px 0 8px 0; }
.fiche-card { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; }
.fiche-card-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.fiche-card-content { min-width: 0; }
.fiche-card-label { font-size: 7px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.fiche-card-value { font-size: 9px; font-weight: 700; color: #1f2937; margin-top: 1px; word-break: break-word; }
.fiche-badge-grid { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
.fiche-badge { display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; padding: 4px 10px; }
.fiche-badge-check { width: 14px; height: 14px; border-radius: 50%; background: #10b981; color: white; font-size: 8px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.fiche-badge-text { font-size: 8px; font-weight: 600; color: #065f46; }
.fiche-badge-empty { font-size: 9px; color: #94a3b8; font-style: italic; padding: 4px 0; }
.fiche-stamp-table { width: 100%; border-collapse: collapse; }
.fiche-stamp-cell { width: 50%; border: 2px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center; }
.fiche-stamp-title { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
.fiche-stamp-ok { font-size: 11px; font-weight: bold; color: #059669; margin-top: 4px; }
.fiche-stamp-wait { font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 4px; }
.fiche-footer { font-size: 8px; color: #64748b; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
.fiche-remark-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 10px; margin: 6px 0; }
.fiche-remark-title { font-size: 10px; font-weight: bold; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; }
.fiche-remark-item { font-size: 10px; color: #1e293b; margin-top: 4px; line-height: 1.5; }
@media print { .no-print { display: none !important; } }
@media print { .fiche-section, .fiche-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .fiche-section { background: #1e3a8a !important; } .fiche-card { background: #f8fafc !important; break-inside: avoid; } }
`

// ═══════════════════════════════════════════════════════════════════════════
//  FICHE DOCUMENT — renders the actual content
// ═══════════════════════════════════════════════════════════════════════════

function FicheDocument({ data }: { data: OrderFull }) {
  const opts = optsList(data)
  const vitesse = data.vitesseMs ? parseFloat(data.vitesseMs) : 0
  const hauteurM = data.hauteurGaineMm ? (parseInt(data.hauteurGaineMm) / 1000).toFixed(1) : '—'
  const nbreEtages = data.nombreEtages || '—'
  const chargeUtile = 1250
  const nbrePersonnes = Math.round(chargeUtile / 75)
  const d = data
  const hasNC = (d.profondeurCuvetteMm && parseInt(d.profondeurCuvetteMm) < 1400) ||
                (d.hauteurDernierEtageMm && parseInt(d.hauteurDernierEtageMm) < 3800)

  return (
    <div className="fiche-document">
      <table className="fiche-header"><tr>
        <td className="fiche-header-brand">
          <div className="fiche-title">RM<span className="fiche-orange">ASC</span></div>
          <div className="fiche-subtitle">FICHE TECHNIQUE ASCENSEUR</div>
        </td>
        <td className="fiche-header-serial">
          <div className="fiche-serial-label">NUMÉRO DE SÉRIE</div>
          <div className="fiche-serial-value">{data.serialNumber}</div>
        </td>
      </tr></table>
      <div className="fiche-date">{fmtDate(data.createdAt)}</div>

      <div className="fiche-section">1. INFORMATIONS CLIENT</div>
      <div className="fiche-card-grid">
        <div className="fiche-card"><div className="fiche-card-icon">👤</div><div className="fiche-card-content"><div className="fiche-card-label">Nom</div><div className="fiche-card-value">{data.clientName}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📍</div><div className="fiche-card-content"><div className="fiche-card-label">Ville</div><div className="fiche-card-value">{data.clientCity}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📧</div><div className="fiche-card-content"><div className="fiche-card-label">Email</div><div className="fiche-card-value">{data.clientEmail || '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📞</div><div className="fiche-card-content"><div className="fiche-card-label">Téléphone</div><div className="fiche-card-value">{data.clientPhone}</div></div></div>
      </div>

      <div className="fiche-section">2. MOTORISATION</div>
      <div className="fiche-card-grid">
        <div className="fiche-card" style={{background:'#fffbeb',borderColor:'#fde68a'}}><div className="fiche-card-icon">⚡</div><div className="fiche-card-content"><div className="fiche-card-label">Type</div><div className="fiche-card-value">{data.typeMotorisation}</div></div></div>
        <div className="fiche-card" style={{background:'#fffbeb',borderColor:'#fde68a'}}><div className="fiche-card-icon">🔧</div><div className="fiche-card-content"><div className="fiche-card-label">Sous-type</div><div className="fiche-card-value">{data.sousTypeElectrique || '—'}</div></div></div>
        <div className="fiche-card" style={{background:'#fffbeb',borderColor:'#fde68a'}}><div className="fiche-card-icon">🚀</div><div className="fiche-card-content"><div className="fiche-card-label">Vitesse</div><div className="fiche-card-value">{vitesse > 0 ? `${vitesse} m/s` : '—'}</div></div></div>
        <div className="fiche-card" style={{background:'#fffbeb',borderColor:'#fde68a'}}><div className="fiche-card-icon">🏢</div><div className="fiche-card-content"><div className="fiche-card-label">Étages</div><div className="fiche-card-value">{nbreEtages}</div></div></div>
      </div>

      <div className="fiche-section">3. DIMENSIONS (GAINE TECHNIQUE)</div>
      <div className="fiche-card-grid">
        <div className="fiche-card"><div className="fiche-card-icon">↔️</div><div className="fiche-card-content"><div className="fiche-card-label">Largeur</div><div className="fiche-card-value">{data.largeurGaineMm} mm</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">↕️</div><div className="fiche-card-content"><div className="fiche-card-label">Profondeur</div><div className="fiche-card-value">{data.profondeurGaineMm} mm</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📏</div><div className="fiche-card-content"><div className="fiche-card-label">Hauteur</div><div className="fiche-card-value">{data.hauteurGaineMm} mm</div></div></div>
      </div>

      <div className="fiche-section">4. MATÉRIAUX & FINITIONS</div>
      <div className="fiche-card-grid">
        <div className="fiche-card"><div className="fiche-card-icon">🧱</div><div className="fiche-card-content"><div className="fiche-card-label">Cabine</div><div className="fiche-card-value">{data.materiauCabine || '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🚪</div><div className="fiche-card-content"><div className="fiche-card-label">Portes</div><div className="fiche-card-value">{data.materiauPortes || '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📐</div><div className="fiche-card-content"><div className="fiche-card-label">Finition portes</div><div className="fiche-card-value">{fmt(data.finitionPorteCabine)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🎨</div><div className="fiche-card-content"><div className="fiche-card-label">Finition intérieur</div><div className="fiche-card-value">{fmt(data.finitionInterieurCabine)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🪟</div><div className="fiche-card-content"><div className="fiche-card-label">Parois</div><div className="fiche-card-value">{data.materiauParois || '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🏠</div><div className="fiche-card-content"><div className="fiche-card-label">Revêtement sol</div><div className="fiche-card-value">{fmt(data.revetementSol)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🧩</div><div className="fiche-card-content"><div className="fiche-card-label">Matériau sol</div><div className="fiche-card-value">{data.materiauSol || '—'}</div></div></div>
      </div>

      <div className="fiche-section">5. COMPOSANTS MÉCANIQUES</div>
      <div className="fiche-card-grid">
        <div className="fiche-card"><div className="fiche-card-icon">🏗️</div><div className="fiche-card-content"><div className="fiche-card-label">Type cabine</div><div className="fiche-card-value">{fmt(data.typeCabine)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🔩</div><div className="fiche-card-content"><div className="fiche-card-label">Châssis</div><div className="fiche-card-value">{fmt(data.typeChassisArcade)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">🚪</div><div className="fiche-card-content"><div className="fiche-card-label">Portes palières</div><div className="fiche-card-value">{fmt(data.typePorte) || '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📏</div><div className="fiche-card-content"><div className="fiche-card-label">Passage libre</div><div className="fiche-card-value">{data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">📐</div><div className="fiche-card-content"><div className="fiche-card-label">Hauteur utile</div><div className="fiche-card-value">{data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '—'}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">⚙️</div><div className="fiche-card-content"><div className="fiche-card-label">Suspension</div><div className="fiche-card-value">{fmt(data.typeSuspensionGuidage)}</div></div></div>
        <div className="fiche-card"><div className="fiche-card-icon">⚖️</div><div className="fiche-card-content"><div className="fiche-card-label">Surcharge</div><div className="fiche-card-value">{fmt(data.systemeSurcharge)}</div></div></div>
      </div>

      <div className="fiche-section">6. OPTIONS & ACCESSOIRES</div>
      <div className="fiche-badge-grid">
        {opts.length === 0 ? <div className="fiche-badge-empty">Aucune option</div> :
          opts.map((o, i) => (
            <div key={i} className="fiche-badge"><span className="fiche-badge-check">✓</span><span className="fiche-badge-text">{o}</span></div>
          ))
        }
      </div>

      {data.notes && (
        <div className="fiche-remark-box" style={{marginTop:8}}>
          <div className="fiche-remark-title">📝 Notes complémentaires</div>
          <div className="fiche-remark-item">{data.notes}</div>
        </div>
      )}

      {hasNC && (
        <div className="fiche-remark-box" style={{background:'#fef2f2',borderColor:'#fecaca',marginTop:8}}>
          <div className="fiche-remark-title" style={{color:'#b91c1c'}}>📋 Non-Conformités NF EN 81-20</div>
          {d.profondeurCuvetteMm && parseInt(d.profondeurCuvetteMm) < 1400 && (
            <div className="fiche-remark-item">⚠️ Profondeur cuvette insuffisante ({d.profondeurCuvetteMm} mm)</div>
          )}
          {d.hauteurDernierEtageMm && parseInt(d.hauteurDernierEtageMm) < 3800 && (
            <div className="fiche-remark-item">⚠️ Hauteur sous dalle insuffisante ({d.hauteurDernierEtageMm} mm)</div>
          )}
        </div>
      )}

      <div className="fiche-section" style={{marginTop:16}}>7. APPROBATIONS & CACHETS</div>
      <table className="fiche-stamp-table"><tr>
        <td className="fiche-stamp-cell">
          <div className="fiche-stamp-title">Plan d'Installation</div>
          {data.cadSubmissions?.some(s => s.engineeringType === 'DESSIN_TECH_1' && s.status === 'APPROUVE')
            ? <div className="fiche-stamp-ok">✅ Approuvé</div>
            : <div className="fiche-stamp-wait">En attente...</div>}
        </td>
        <td className="fiche-stamp-cell">
          <div className="fiche-stamp-title">Dessin 2D Cabine</div>
          {data.cadSubmissions?.some(s => s.engineeringType === 'DESSIN_TECH_2' && s.status === 'APPROUVE')
            ? <div className="fiche-stamp-ok">✅ Approuvé</div>
            : <div className="fiche-stamp-wait">En attente...</div>}
        </td>
      </tr></table>

      <div className="fiche-footer">
        Document généré automatiquement par RMASC ERP<br/>
        N° {data.serialNumber} — {fmtDate(data.createdAt)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function FicheTechniqueView({ orderId, onBack }: { orderId: string; onBack?: () => void }) {
  const [data, setData] = useState<OrderFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const d: OrderFull = await apiFetch(`/orders/${orderId}/datasheet`)
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId])

  const handlePrint = () => {
    if (!data) return
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    // Build the HTML by rendering the component to a string
    const container = document.createElement('div')
    // We'll use the ref's innerHTML
    const ficheHtml = docRef.current?.innerHTML || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Fiche Technique — ${data.serialNumber}</title>
        <style>${FICHE_STYLES}</style>
        <style>
          @page { margin: 8mm; size: A4 portrait; }
          body { margin: 0 auto; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div style="max-width:190mm;margin:0 auto;padding:5mm;">${ficheHtml}</div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 500);
          };
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-100 rounded-2xl">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Génération de la Fiche Technique...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-100 rounded-2xl">
        <div className="text-center max-w-md px-6">
          <span className="text-4xl block mb-3">⚠️</span>
          <p className="text-sm text-red-600 font-medium mb-2">{error || 'Fiche technique introuvable'}</p>
          <p className="text-xs text-slate-400 mb-4">Vérifiez que la commande existe et que les données sont complètes.</p>
          {onBack && <button onClick={onBack} className="text-xs text-blue-600 underline font-medium">← Retour</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Inject styles globally */}
      <style>{FICHE_STYLES}</style>

      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-slate-800">Fiche Technique</h1>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{data.serialNumber}</span>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm">
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* Document */}
      <div className="py-8 px-4 md:px-8 flex justify-center no-print">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-[210mm]">
          <div className="p-6 md:p-8" ref={docRef}>
            <FicheDocument data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
