import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../config/api'

interface CADSubmission {
  id: string
  engineeringType: string
  engineerName: string
  status: string
  approvedAt: string | null
  rejectionReason: string | null
  approvalToken: string | null
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

// ─── A4 Document Component ────────────────────────────────────────────────
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
      {/* ─── HEADER ─── */}
      <table className="fiche-header">
        <tr>
          <td className="fiche-header-brand">
            <div className="fiche-title">RM<span className="fiche-orange">ASC</span></div>
            <div className="fiche-subtitle">FICHE TECHNIQUE ASCENSEUR</div>
          </td>
          <td className="fiche-header-serial">
            <div className="fiche-serial-label">NUMÉRO DE SÉRIE</div>
            <div className="fiche-serial-value">{data.serialNumber}</div>
          </td>
        </tr>
      </table>

      <div className="fiche-date">{fmtDate(data.createdAt)}</div>

      {/* ─── 1. CLIENT ─── */}
      <div className="fiche-section">1. INFORMATIONS CLIENT</div>
      <table className="fiche-table">
        <tr className="fiche-row-bold"><td className="fiche-label">Nom du client</td><td className="fiche-value">{data.clientName}</td></tr>
        <tr><td className="fiche-label">Email</td><td className="fiche-value">{data.clientEmail || '(Optionnel — non renseigné)'}</td></tr>
        <tr><td className="fiche-label">Téléphone</td><td className="fiche-value">{data.clientPhone}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Ville</td><td className="fiche-value">{data.clientCity}</td></tr>
      </table>

      {/* ─── 2. MOTORISATION ─── */}
      <div className="fiche-section">2. MOTORISATION</div>
      <table className="fiche-table">
        <tr className="fiche-row-bold"><td className="fiche-label">Type de motorisation</td><td className="fiche-value">{data.typeMotorisation}</td></tr>
        <tr><td className="fiche-label">Sous-type</td><td className="fiche-value">{data.sousTypeElectrique || '—'}</td></tr>
        <tr><td className="fiche-label">Vitesse</td><td className="fiche-value">{vitesse > 0 ? `${vitesse} m/s` : '—'}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Nombre d'étages</td><td className="fiche-value">{data.nombreEtages || '—'}</td></tr>
      </table>

      {/* ─── 3. DIMENSIONS ─── */}
      <div className="fiche-section">3. DIMENSIONS (GAINE TECHNIQUE)</div>
      <table className="fiche-table">
        <tr className="fiche-row-bold"><td className="fiche-label">Largeur gaine</td><td className="fiche-value">{data.largeurGaineMm} mm</td></tr>
        <tr><td className="fiche-label">Profondeur gaine</td><td className="fiche-value">{data.profondeurGaineMm} mm</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Hauteur de la gaine</td><td className="fiche-value">{data.hauteurGaineMm} mm</td></tr>
      </table>

      {/* ─── 4. MATÉRIAUX & FINITIONS — Professional Card Layout ─── */}
      <div className="fiche-section">4. MATÉRIAUX & FINITIONS</div>
      <div className="fiche-card-grid">
        <div className="fiche-card">
          <div className="fiche-card-icon">🧱</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Cabine</div>
            <div className="fiche-card-value">{data.materiauCabine || '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🚪</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Portes</div>
            <div className="fiche-card-value">{data.materiauPortes || '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">📐</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Finition portes cabine</div>
            <div className="fiche-card-value">{fmt(data.finitionPorteCabine)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🎨</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Finition intérieur cabine</div>
            <div className="fiche-card-value">{fmt(data.finitionInterieurCabine)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🪟</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Parois</div>
            <div className="fiche-card-value">{data.materiauParois || '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🏠</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Revêtement de sol</div>
            <div className="fiche-card-value">{fmt(data.revetementSol)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🧩</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Matériau sol</div>
            <div className="fiche-card-value">{data.materiauSol || '—'}</div>
          </div>
        </div>
      </div>

      {/* ─── 5. COMPOSANTS MÉCANIQUES — Professional Card Layout ─── */}
      <div className="fiche-section">5. COMPOSANTS MÉCANIQUES SPÉCIFIQUES</div>
      <div className="fiche-card-grid">
        <div className="fiche-card">
          <div className="fiche-card-icon">🏗️</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Type de cabine</div>
            <div className="fiche-card-value">{fmt(data.typeCabine)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🔩</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Châssis / Arcade</div>
            <div className="fiche-card-value">{fmt(data.typeChassisArcade)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">🚪</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Portes palières</div>
            <div className="fiche-card-value">{fmt(data.typePorte) || '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">📏</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Passage libre</div>
            <div className="fiche-card-value">{data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">📐</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Hauteur utile cabine</div>
            <div className="fiche-card-value">{data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '—'}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">⚙️</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Suspension / Guidage</div>
            <div className="fiche-card-value">{fmt(data.typeSuspensionGuidage)}</div>
          </div>
        </div>
        <div className="fiche-card">
          <div className="fiche-card-icon">⚖️</div>
          <div className="fiche-card-content">
            <div className="fiche-card-label">Surcharge</div>
            <div className="fiche-card-value">{fmt(data.systemeSurcharge)}</div>
          </div>
        </div>
      </div>

      {/* ─── 6. OPTIONS — Professional Badge Layout ─── */}
      <div className="fiche-section">6. OPTIONS & ACCESSOIRES</div>
      <div className="fiche-badge-grid">
        {opts.length === 0 ? (
          <div className="fiche-badge-empty">Aucune option sélectionnée</div>
        ) : opts.map((o, i) => (
          <div key={i} className="fiche-badge">
            <span className="fiche-badge-check">✓</span>
            <span className="fiche-badge-text">{o}</span>
          </div>
        ))}
      </div>

      {/* ─── 7. APPROBATIONS ─── */}
      <div className="fiche-section">7. APPROBATIONS & CACHETS</div>
      <table className="fiche-stamp-table">
        <tr>
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
        </tr>
      </table>

      {/* ─── NOTES COMPLÉMENTAIRES ─── */}
      {data.notes && (
        <div className="fiche-remark-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
          <div className="fiche-remark-title" style={{ color: '#0369a1' }}>📝 Notes complémentaires</div>
          <div className="fiche-remark-item" style={{ color: '#0c4a6e', fontSize: 10, marginTop: 4 }}>{data.notes}</div>
        </div>
      )}

      {/* ─── NON-CONFORMITÉS NF EN 81-20 ─── */}
      {hasNC && (
        <div className="fiche-remark-box">
          <div className="fiche-remark-title">📋 Remarques Techniques — Non-Conformités</div>
          {data.profondeurCuvetteMm && parseInt(data.profondeurCuvetteMm) < 1400 && (
            <div className="fiche-remark-item">
              ⚠️ <strong>Profondeur cuvette insuffisante</strong> ({data.profondeurCuvetteMm} mm &lt; 1400 mm)<br />
              La gaine n'est pas conforme aux spécifications standards. Des travaux supplémentaires de génie civil seront nécessaires.
            </div>
          )}
          {data.hauteurDernierEtageMm && parseInt(data.hauteurDernierEtageMm) < 3800 && (
            <div className="fiche-remark-item">
              ⚠️ <strong>Hauteur sous dalle insuffisante</strong> ({data.hauteurDernierEtageMm} mm &lt; 3800 mm)<br />
              La hauteur du dernier étage n'est pas conforme. Des adaptations structurelles seront requises.
            </div>
          )}
          <div style={{ fontSize: 9, color: '#991b1b', fontStyle: 'italic', marginTop: 6, paddingTop: 6, borderTop: '1px solid #fecaca' }}>
            Ces remarques n'ont pas bloqué le processus de commande. Elles sont transmises à titre d'information technique.
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div className="fiche-footer">
        Document généré automatiquement par RMASC ERP — Bureau d'étude intégré
        <br />N° {data.serialNumber} — {fmtDate(data.createdAt)}
      </div>

      {/* Embed CSS for this document */}
      <style>{`
        .fiche-document { font-family: 'Arial', 'Helvetica', sans-serif; color: #1f2937; }
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
        .fiche-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .fiche-table tr { border-bottom: 1px solid #e2e8f0; }
        .fiche-table td { padding: 4px 12px; }
        .fiche-table .fiche-label { width: 45%; color: #64748b; font-weight: 500; }
        .fiche-table .fiche-value { width: 55%; font-weight: 600; color: #1f2937; }
        .fiche-row-bold td { font-weight: 700; }
        .fiche-row-highlight td { background: #fff7ed; }
        .fiche-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 4px 0 8px 0; }
        .fiche-card { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; }
        .fiche-card-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .fiche-card-content { min-width: 0; }
        .fiche-card-label { font-size: 7px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .fiche-card-value { font-size: 9px; font-weight: 700; color: #1f2937; margin-top: 1px; word-break: break-word; }
        .fiche-badge-grid { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
        .fiche-badge { display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; padding: 4px 10px; }
        .fiche-badge-check { width: 14px; height: 14px; border-radius: 50%; background: #10b981; color: white; font-size: 8px; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fiche-badge-text { font-size: 8px; font-weight: 600; color: #065f46; }
        .fiche-badge-empty { font-size: 9px; color: #94a3b8; font-style: italic; padding: 4px 0; }
        .fiche-stamp-table { width: 100%; border-collapse: collapse; }
        .fiche-stamp-cell { width: 50%; border: 2px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center; }
        .fiche-stamp-title { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .fiche-stamp-ok { font-size: 11px; font-weight: bold; color: #059669; margin-top: 4px; }
        .fiche-stamp-wait { font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 4px; }
        .fiche-footer { font-size: 8px; color: #64748b; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .fiche-remark-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 10px; margin: 6px 0; }
        .fiche-remark-title { font-size: 10px; font-weight: bold; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; }
        .fiche-remark-item { font-size: 9px; color: #991b1b; margin-top: 4px; }
        @media print {
          .fiche-document { padding: 0; margin: 0; }
          .fiche-section { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #1e3a8a !important; }
          .fiche-row-highlight td { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff7ed !important; }
          .fiche-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f8fafc !important; break-inside: avoid; }
          .fiche-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #ecfdf5 !important; }
          .fiche-badge-check { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #10b981 !important; }
          .fiche-stamp-cell { border-color: #94a3b8; }
          .fiche-remark-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .fiche-card-grid { break-inside: avoid; }
          .fiche-badge-grid { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId])

  const handlePrint = () => {
    if (!data || !docRef.current) return
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    // Get the rendered fiche-document HTML
    const ficheHtml = docRef.current.innerHTML

    const styles = Array.from(document.querySelectorAll('style, link[rel=stylesheet]'))
      .map(el => el.outerHTML)
      .join('\n')

    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiche Technique — ${data.serialNumber}</title>
  ${styles}
  <style>
    @page { margin: 8mm; size: A4 portrait; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .fiche-document { width: 100%; padding: 0; }
    .fiche-section, .fiche-table, .fiche-remark-box { break-inside: avoid; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div style="max-width: 190mm; margin: 0 auto;">${ficheHtml}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 500); };
  <\/script>
</body>
</html>`

    printWindow.document.write(content)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Génération de la Fiche Technique...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium">Erreur: {error || 'Données introuvables'}</p>
          {onBack && <button onClick={onBack} className="mt-3 text-xs text-blue-600 underline">Retour</button>}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ─── TOOLBAR (HIDDEN IN PRINT) ─── */}
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
        <div className="flex items-center gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm">
            🖨️ Imprimer / PDF
          </button>
        </div>
      </div>

      {/* ─── FICHE TECHNIQUE — Full visible document ─── */}
      <div className="bg-slate-100 min-h-screen py-8 px-4 md:px-8 flex justify-center no-print">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden w-full max-w-[210mm] print:shadow-none print:rounded-none">
          <div className="p-6 md:p-8 print:p-4" ref={docRef}>
            <FicheDocument data={data} />
          </div>
        </div>
      </div>
    </>
  )
}
