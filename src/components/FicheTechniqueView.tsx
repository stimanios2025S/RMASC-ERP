import { useState, useEffect } from 'react'
import { apiFetch } from '../config/api'

// ─── Types ────────────────────────────────────────────────────────────────
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
  id: string
  serialNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
  clientCity: string
  status: string
  typeMotorisation: string
  sousTypeElectrique: string | null
  vitesseMs: string | null
  nombreEtages: string | null
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  profondeurCuvetteMm?: string | null
  hauteurDernierEtageMm?: string | null
  largeurCabineCalculeeMm?: string | null
  profondeurCabineCalculeeMm?: string | null
  contrepoidsPosition?: string | null
  positionContrepoids?: string | null
  materiauCabine: string | null
  materiauPortes: string | null
  materiauParois: string | null
  materiauSol: string | null
  // ── Mekisan catalog fields
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
  createdAt: string
  cadSubmissions: CADSubmission[]
}

async function fetchJson(path: string) {
  return apiFetch(path)
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Attente Plan Installation',
    ATTENTE_APPROBATION_ADMIN: 'Approbation Admin', ATTENTE_DESSIN_2D: 'Attente Dessin 2D',
    ATTENTE_VERIFICATION: 'Vérification Finale', PRET_POUR_PRODUCTION: 'Prêt Production',
    VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }
  return labels[status] || status
}

function formatCatalogEnum(val: string | null | undefined): string {
  if (!val) return '—'
  return val
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function optionsList(data: OrderFull): string[] {
  const opts: string[] = []
  if (data.optPanoramique) opts.push('Ascenseur panoramique')
  if (data.optSecours) opts.push('Alimentation de secours')
  if (data.optAnnoncesVocales) opts.push('Annonces vocales')
  if (data.optCctv) opts.push('CCTV intégré')
  if (data.optPortesCoupeFeu) opts.push('Portes coupe-feu')
  if (data.optPanneauTactile) opts.push('Panneau tactile')
  return opts
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Row helper for consistency ───────────────────────────────────────────
function FieldRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded ${highlight ? 'bg-amber-50/50' : ''}`}>
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800 text-right max-w-[55%]">{value || '—'}</span>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="bg-slate-800 px-3 py-1.5 rounded-lg">
      <span className="text-[11px] font-bold text-white uppercase tracking-wider">{title}</span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── Main Component ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export default function FicheTechniqueView({ orderId, onBack }: { orderId: string; onBack?: () => void }) {
  const [data, setData] = useState<OrderFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setPrinting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const d: OrderFull = await fetchJson(`/api/orders/${orderId}/datasheet`)
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
    setPrinting(true)
    // Add print class to body for CSS to apply before print dialog
    document.body.classList.add('printing')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('printing')
      setPrinting(false)
    }, 800)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-400">Génération de la Fiche Technique...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium">Erreur: {error || 'Données introuvables'}</p>
          <button onClick={onBack} className="mt-3 text-xs text-primary-600 underline">Retour</button>
        </div>
      </div>
    )
  }

  const opts = optionsList(data)
  const vitesse = data.vitesseMs ? parseFloat(data.vitesseMs) : 0
  const hauteurM = data.hauteurGaineMm ? (parseInt(data.hauteurGaineMm) / 1000).toFixed(1) : '—'
  const nbreEtages = data.nombreEtages || '—'
  const chargeUtile = 1250 // default KG for spec sheet
  const nbrePersonnes = Math.round(chargeUtile / 75)

  return (
    <div className="bg-slate-100 print:bg-white" style={{ minHeight: '100vh' }}>
      <style>{`
        @media print {
          @page { margin: 5mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
      {/* ── Toolbar (hidden when printing) ── */}
      <div className="no-print sticky top-0 z-40 bg-surface-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-slate-800">Fiche Technique</h1>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{data.serialNumber}</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all shadow-sm"
        >
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          FICHE TECHNIQUE — Full page document
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full mx-auto py-4 px-3 md:px-4 print:mx-0 print:py-0 print:px-0" style={{ maxWidth: '900px' }}>
        <div className="bg-surface-50 rounded-2xl shadow-lg border border-slate-200 print:rounded-none print:shadow-none print:border-0">

          {/* ═══ HEADER ═══ */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 print:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight"><span className="text-amber-400">RM</span><span className="text-orange-400">ASC</span> <span className="text-amber-400">FACTORY</span></h2>
                <p className="text-[9px] text-slate-400 tracking-widest uppercase mt-0.5">Fiche Technique Ascenseur</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-mono text-amber-400 font-bold">{data.serialNumber}</p>
                <p className="text-[9px] text-slate-400">Émis le: {formatDate(data.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* ═══ CLIENT + STATUS ═══ */}
          <div className="grid grid-cols-2 gap-px bg-slate-200 print:bg-slate-200">
            <div className="bg-surface-50 px-4 py-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Client</p>
              <p className="text-sm font-bold text-slate-800">{data.clientName}</p>
              <p className="text-[11px] text-slate-500">{data.clientCity}</p>
              {data.clientEmail && <p className="text-[9px] text-slate-400">{data.clientEmail}</p>}
              <p className="text-[9px] text-slate-400">{data.clientPhone}</p>
            </div>
            <div className="bg-surface-50 px-4 py-2 text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Statut</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                ['PRET_POUR_PRODUCTION', 'VALIDEE', 'ATTENTE_VERIFICATION'].includes(data.status)
                  ? 'bg-emerald-100 text-emerald-700'
                  : data.status === 'BROUILLON' ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {statusLabel(data.status)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1.5">Motorisation: {data.typeMotorisation}</p>
              <p className="text-[10px] text-slate-400">{data.sousTypeElectrique || '—'}</p>
            </div>
          </div>

          {/* ═══ BODY: 2-column grid of sections ═══ */}
          <div className="p-3 md:p-4 space-y-2">

            {/* Section 1: Caractéristiques Générales */}
            <SectionTitle title="1. Caractéristiques Générales" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <FieldRow label="Charge utile" value={`${chargeUtile} kg`} highlight />
              <FieldRow label="Nombre de personnes" value={`${nbrePersonnes} pers. (75 kg/pers.)`} />
              <FieldRow label="Vitesse nominale" value={vitesse > 0 ? `${vitesse} m/s` : '—'} highlight />
              <FieldRow label="Course totale" value={`${hauteurM} m`} />
              <FieldRow label="Nombre de niveaux" value={`${nbreEtages} arrêts`} highlight />
              <FieldRow label="Type de motorisation" value={data.typeMotorisation} />
            </div>

            {/* Section 2: Chaîne Cinématique / Motorisation */}
            <SectionTitle title="2. Chaîne Cinématique & Motorisation" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <FieldRow label="Type de traction" value={data.sousTypeElectrique || '—'} highlight />
              <FieldRow label="Machine Roomless (MRL)" value={data.typeMotorisation === 'ÉLECTRIQUE' ? 'Oui' : 'Non'} />
              <FieldRow label="Alimentation" value="Triphasé 380V / Monophasé 220V" highlight />
              <FieldRow label="Fréquence" value="50 Hz" />
              <FieldRow label="Application" value="Résidentiel / Commercial" highlight />
            </div>

            {/* Section 3: Dimensions Gaine & Cabine */}
            <SectionTitle title="3. Dimensions de la Gaine & Cabine (mm)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <FieldRow label="Largeur gaine" value={`${data.largeurGaineMm} mm`} highlight />
              <FieldRow label="Profondeur gaine" value={`${data.profondeurGaineMm} mm`} />
              <FieldRow label="Hauteur gaine" value={`${data.hauteurGaineMm} mm`} highlight />
              <FieldRow label="Profondeur cuvette (Pit)" value={data.profondeurCuvetteMm ? `${data.profondeurCuvetteMm} mm` : '—'} highlight />
              <FieldRow label="Hauteur dernier étage (Headroom)" value={data.hauteurDernierEtageMm ? `${data.hauteurDernierEtageMm} mm` : '—'} />
              <FieldRow label="Largeur cabine calculée" value={data.largeurCabineCalculeeMm ? `${data.largeurCabineCalculeeMm} mm` : '—'} highlight />
              <FieldRow label="Profondeur cabine calculée" value={data.profondeurCabineCalculeeMm ? `${data.profondeurCabineCalculeeMm} mm` : '—'} />
              <FieldRow label="Position contrepoids" value={data.contrepoidsPosition === 'Fond' ? 'Au Fond' : data.contrepoidsPosition === 'Latéral' ? 'Latéral' : '—'} highlight />
            </div>

            {/* ─── REMARQUES TECHNIQUES NF EN 81-20 ─────────────────────── */}
            {(data.profondeurCuvetteMm && parseInt(data.profondeurCuvetteMm) < 1400) || (data.hauteurDernierEtageMm && parseInt(data.hauteurDernierEtageMm) < 3800) ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 space-y-1.5 print:bg-red-50 print:border-red-200">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-sm">📋</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">Remarques Techniques — Non-Conformités</span>
                </div>
                <div className="space-y-1.5 pl-1">
                  {data.profondeurCuvetteMm && parseInt(data.profondeurCuvetteMm) < 1400 && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 text-[10px] mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs font-semibold text-red-700">Profondeur cuvette insuffisante ({data.profondeurCuvetteMm} mm &lt; 1400 mm)</p>
                        <p className="text-[10px] text-red-600 leading-tight">La gaine n'est pas conforme aux spécifications standards. Des travaux supplémentaires de génie civil seront nécessaires pour l'adaptation de la cuvette. Cette non-conformité entraîne un surcoût d'installation et des délais supplémentaires.</p>
                      </div>
                    </div>
                  )}
                  {data.hauteurDernierEtageMm && parseInt(data.hauteurDernierEtageMm) < 3800 && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 text-[10px] mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs font-semibold text-red-700">Hauteur sous dalle insuffisante ({data.hauteurDernierEtageMm} mm &lt; 3800 mm)</p>
                        <p className="text-[10px] text-red-600 leading-tight">La hauteur du dernier étage n'est pas conforme aux spécifications standards. Des adaptations structurelles seront requises pour l'échappement de tête et les dégagements de sécurité NF EN 81-20.</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-red-500 italic pt-1 border-t border-red-100">Ces remarques n'ont pas bloqué le processus de commande. Elles sont transmises à titre d'information technique pour le client et l'équipe d'installation.</p>
              </div>
            ) : null}

            {/* Section 4: Baies & Portes */}
            <SectionTitle title="4. Baies & Portes Palières" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <FieldRow label="Type de portes" value={data.optPortesCoupeFeu ? 'Coupe-feu' : 'Standard'} highlight />
              <FieldRow label="Type d'ouverture" value={formatCatalogEnum(data.typePorte)} highlight />
              <FieldRow label="Nombre de vantaux" value="2 vantaux (OU) / Centrales 2V" />
              <FieldRow label="Largeur de passage libre" value={data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '~800 mm'} highlight />
              <FieldRow label="Hauteur de passage libre" value={data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '~2100 mm'} />
              <FieldRow label="Finition portes cabine" value={formatCatalogEnum(data.finitionPorteCabine)} highlight />
              <FieldRow label="Finition portes palières" value={data.materiauPortes || '—'} />
              <FieldRow label="Finition cabine" value={data.materiauCabine || '—'} />
              <FieldRow label="Matériau parois" value={data.materiauParois || '—'} highlight />
              <FieldRow label="Matériau sol" value={data.materiauSol || '—'} />
            </div>

            {/* Section 5: Composants Mécaniques Spécifiques */}
            <SectionTitle title="5. Composants Mécaniques Spécifiques" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <FieldRow label="Type de cabine" value={formatCatalogEnum(data.typeCabine)} highlight />
              <FieldRow label="Type de châssis / arcade" value={formatCatalogEnum(data.typeChassisArcade)} highlight />
              <FieldRow label="Finition intérieur cabine" value={formatCatalogEnum(data.finitionInterieurCabine)} highlight />
              <FieldRow label="Revêtement de sol" value={formatCatalogEnum(data.revetementSol)} />
              <FieldRow label="Suspension / guidage" value={formatCatalogEnum(data.typeSuspensionGuidage)} highlight />
              <FieldRow label="Système de surcharge" value={formatCatalogEnum(data.systemeSurcharge)} />
            </div>

            {/* Section 6: Options */}
            <SectionTitle title="6. Options & Accessoires" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              {opts.length === 0 ? (
                <FieldRow label="Options sélectionnées" value="Aucune" />
              ) : (
                opts.map((opt, i) => (
                  <FieldRow key={i} label={opt} value="✓ Inclus" highlight={i % 2 === 0} />
                ))
              )}
            </div>

            {/* Section 7: Signatures & Stamps */}
            <SectionTitle title="7. Approbations & Cachets Bureau d'Études" />
            <div className="border border-dashed border-slate-300 rounded-xl p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center min-h-[50px]">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Plan d'Installation</p>
                  {data.cadSubmissions && data.cadSubmissions.some(s => s.engineeringType === 'DESSIN_TECH_1' && s.status === 'APPROUVE') ? (
                    <p className="text-[11px] font-bold text-emerald-600 mt-1">✅ Approuvé</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic mt-1">En attente...</p>
                  )}
                </div>
                <div className="text-center p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center min-h-[50px]">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Dessin 2D Cabine</p>
                  {data.cadSubmissions && data.cadSubmissions.some(s => s.engineeringType === 'DESSIN_TECH_2' && s.status === 'APPROUVE') ? (
                    <p className="text-[11px] font-bold text-emerald-600 mt-1">✅ Approuvé</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic mt-1">En attente...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[8px] text-slate-400">
              <p>RMASC FACTORY — Fiche Technique générée automatiquement</p>
              <p>N° {data.serialNumber} — {formatDate(data.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
