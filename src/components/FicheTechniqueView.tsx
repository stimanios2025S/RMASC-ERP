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
  id: string; serialNumber: string; clientName: string
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

      {/* ─── 4. MATÉRIAUX & FINITIONS ─── */}
      <div className="fiche-section">4. MATÉRIAUX & FINITIONS</div>
      <table className="fiche-table">
        <tr className="fiche-row-bold"><td className="fiche-label">Matériau cabine</td><td className="fiche-value">{data.materiauCabine || '—'}</td></tr>
        <tr><td className="fiche-label">Matériau portes</td><td className="fiche-value">{data.materiauPortes || '—'}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Finition portes cabine</td><td className="fiche-value">{fmt(data.finitionPorteCabine)}</td></tr>
        <tr className="fiche-row-bold"><td className="fiche-label">Finition intérieur cabine</td><td className="fiche-value">{fmt(data.finitionInterieurCabine)}</td></tr>
        <tr><td className="fiche-label">Matériau parois</td><td className="fiche-value">{data.materiauParois || '—'}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Revêtement de sol</td><td className="fiche-value">{fmt(data.revetementSol)}</td></tr>
        <tr><td className="fiche-label">Matériau sol</td><td className="fiche-value">{data.materiauSol || '—'}</td></tr>
      </table>

      {/* ─── 5. COMPOSANTS MÉCANIQUES ─── */}
      <div className="fiche-section">5. COMPOSANTS MÉCANIQUES SPÉCIFIQUES</div>
      <table className="fiche-table">
        <tr className="fiche-row-bold"><td className="fiche-label">Type de cabine</td><td className="fiche-value">{fmt(data.typeCabine)}</td></tr>
        <tr className="fiche-row-bold"><td className="fiche-label">Type de châssis / arcade</td><td className="fiche-value">{fmt(data.typeChassisArcade)}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Type de portes palières</td><td className="fiche-value">{fmt(data.typePorte) || '—'}</td></tr>
        <tr className="fiche-row-bold"><td className="fiche-label">Largeur de passage libre</td><td className="fiche-value">{data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '—'}</td></tr>
        <tr><td className="fiche-label">Hauteur utile cabine</td><td className="fiche-value">{data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '—'}</td></tr>
        <tr className="fiche-row-bold"><td className="fiche-label">Type suspension / guidage</td><td className="fiche-value">{fmt(data.typeSuspensionGuidage)}</td></tr>
        <tr className="fiche-row-highlight"><td className="fiche-label">Système de surcharge</td><td className="fiche-value">{fmt(data.systemeSurcharge)}</td></tr>
      </table>

      {/* ─── 6. OPTIONS ─── */}
      <div className="fiche-section">6. OPTIONS & ACCESSOIRES</div>
      <table className="fiche-table">
        {opts.length === 0 ? (
          <tr><td className="fiche-label">Options sélectionnées</td><td className="fiche-value">Aucune</td></tr>
        ) : opts.map((o, i) => (
          <tr key={i} className={i % 2 === 0 ? 'fiche-row-highlight' : ''}>
            <td className="fiche-label">{o}</td>
            <td className="fiche-value">✓ Inclus</td>
          </tr>
        ))}
      </table>

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
        .fiche-header { width: 100%; border-collapse: collapse; background: #1e3a8a; color: white; }
        .fiche-header-brand { padding: 12px 16px; width: 60%; }
        .fiche-title { font-size: 22px; font-weight: 800; color: #f59e0b; }
        .fiche-orange { color: #ea580c; }
        .fiche-subtitle { font-size: 10px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .fiche-header-serial { padding: 12px 16px; text-align: right; }
        .fiche-serial-label { font-size: 8px; font-weight: bold; letter-spacing: 1px; }
        .fiche-serial-value { font-size: 14px; font-weight: bold; color: #f59e0b; }
        .fiche-date { font-size: 9px; color: #64748b; margin: 8px 0 4px 0; }
        .fiche-section { background: #1e3a8a; color: white; font-size: 10px; font-weight: bold; padding: 6px 12px; margin: 10px 0 4px 0; letter-spacing: 1px; text-transform: uppercase; }
        .fiche-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .fiche-table tr { border-bottom: 1px solid #e2e8f0; }
        .fiche-table td { padding: 4px 12px; }
        .fiche-label { width: 45%; color: #64748b; font-weight: 500; }
        .fiche-value { width: 55%; font-weight: 600; color: #1f2937; }
        .fiche-row-bold td { font-weight: 700; }
        .fiche-row-highlight td { background: #fff7ed; }
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
          .fiche-stamp-cell { border-color: #94a3b8; }
          .fiche-remark-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

      {/* ─── FICHE TECHNIQUE — FULL WIDTH ─── */}
      <div className="bg-slate-100 py-6 px-4 flex justify-center no-print">
        <div className="bg-white shadow-lg rounded-2xl" style={{ width: '210mm', maxWidth: '100%' }}>
          <div className="p-5 md:p-8" ref={docRef}>
            <FicheDocument data={data} />
          </div>
        </div>
      </div>
    </>
  )
}
