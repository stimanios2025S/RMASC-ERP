import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../config/api'

interface CADSubmission {
  id: string; engineeringType: string; engineerName: string; status: string
  approvedAt: string | null; rejectionReason: string | null; approvalToken: string | null
}

interface OrderFull {
  id: string; serialNumber: string; clientName: string; projectName?: string | null; notes?: string | null
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
  createdAt: string; approvedBy?: string | null; approvedAt?: string | null
  isStamped?: boolean | null; stampedBy?: string | null; stampedAt?: string | null
  stampResults?: Array<{ filename: string; pagesStamped: number; success: boolean }> | null
  cadSubmissions: CADSubmission[]
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
  if (d.optCctv) o.push('CCTV integre')
  if (d.optPortesCoupeFeu) o.push('Portes coupe-feu')
  if (d.optPanneauTactile) o.push('Panneau tactile')
  return o
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Styles for the fiche document — Zero emojis, industrial typography ─────────
const FICHE_STYLES = `
.fiche-document { font-family: 'Arial', 'Helvetica', sans-serif; color: #e2e8f0; max-width: 190mm; margin: 0 auto; font-size: 9px; line-height: 1.35; }

/* ════════════════════════════════════════════════════════════════════════
   1. CORPORATE HEADER (En-tête officiel) — 3-column grid
   ════════════════════════════════════════════════════════════════════════ */
.fiche-entet { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.fiche-entet td { vertical-align: top; padding: 4px 6px; }
.fiche-entet-logo { width: 25%; text-align: center; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px 0 0 0; padding: 8px 6px; }
.fiche-entet-logo-title { font-size: 20px; font-weight: 900; color: #f59e0b; letter-spacing: 0.5px; line-height: 1; }
.fiche-entet-logo-title .accent { color: #ea580c; }
.fiche-entet-logo-sub { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
.fiche-entet-center { width: 45%; border: 1px solid rgba(255,255,255,0.12); border-left: 0; padding: 6px 8px; }
.fiche-entet-right { width: 30%; border: 1px solid rgba(255,255,255,0.12); border-left: 0; border-radius: 0 4px 0 0; padding: 6px 8px; }

.fiche-entet-company { font-size: 11px; font-weight: 800; color: #f1f5f9; }
.fiche-entet-desc { font-size: 7px; color: #94a3b8; margin-top: 1px; }
.fiche-entet-capital { font-size: 7px; color: #64748b; margin-top: 2px; }

.fiche-entet-addr { font-size: 7px; color: #cbd5e1; margin-top: 3px; line-height: 1.45; }
.fiche-entet-tel { font-size: 6.5px; color: #94a3b8; margin-top: 2px; line-height: 1.5; }
.fiche-entet-email { font-size: 6.5px; color: #94a3b8; margin-top: 2px; }
.fiche-entet-web { font-size: 6.5px; color: #f59e0b; margin-top: 1px; }

.fiche-entet-registry { font-size: 6px; color: #94a3b8; line-height: 1.7; }
.fiche-entet-bank { font-size: 6.5px; color: #cbd5e1; margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.08); line-height: 1.5; }
.fiche-entet-bank-label { color: #64748b; }

.fiche-entet-divider { border: none; border-top: 1.5px solid rgba(249,115,22,0.25); margin: 6px 0 10px 0; }

/* ── Document title bar ───────────────────────────────────────────── */
.fiche-doc-bar { display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(249,115,22,0.2); background: rgba(249,115,22,0.08); border-radius: 4px; padding: 6px 12px; margin-bottom: 6px; }
.fiche-doc-title { font-size: 11px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1.5px; }
.fiche-doc-serial { font-size: 11px; font-weight: 700; color: #f59e0b; font-family: 'Courier New', monospace; }
.fiche-doc-date { font-size: 8px; color: #64748b; text-align: right; }

/* ── Section headers ──────────────────────────────────────────────── */
.fiche-section { background: rgba(249,115,22,0.10); color: #fbbf24; font-size: 9px; font-weight: 700; padding: 6px 10px; margin: 10px 0 6px 0; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 3px; border: 1px solid rgba(249,115,22,0.12); }

/* ── Data grid (2-column card layout, no icons) ───────────────────── */
.fiche-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 4px 0 8px 0; }
.fiche-cell { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 4px; padding: 6px 8px; }
.fiche-cell-label { font-size: 6.5px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
.fiche-cell-value { font-size: 9px; font-weight: 700; color: #e2e8f0; margin-top: 2px; word-break: break-word; }
.fiche-cell-wide { grid-column: 1 / -1; }

/* ── Options badge list ───────────────────────────────────────────── */
.fiche-opt-grid { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
.fiche-opt-badge { display: inline-block; background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.20); border-radius: 3px; padding: 3px 8px; font-size: 7px; font-weight: 600; color: #6ee7b7; }
.fiche-opt-none { font-size: 7px; color: #64748b; font-style: italic; padding: 4px 0; }

/* ── Remarks / non-conformities ────────────────────────────────────── */
.fiche-remark { border: 1px solid rgba(239,68,68,0.18); border-radius: 4px; padding: 7px 10px; margin: 8px 0; background: rgba(239,68,68,0.05); }
.fiche-remark-title { font-size: 8px; font-weight: 700; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.6px; }
.fiche-remark-item { font-size: 8px; color: #fecaca; margin-top: 3px; line-height: 1.4; }

/* ── Stamps / approvals table ──────────────────────────────────────── */
.fiche-stamp-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
.fiche-stamp-cell { width: 50%; border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 6px; padding: 10px 8px; text-align: center; }
.fiche-stamp-title { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.7px; }
.fiche-stamp-ok { font-size: 10px; font-weight: 700; color: #34d399; margin-top: 4px; }
.fiche-stamp-wait { font-size: 9px; color: #64748b; font-style: italic; margin-top: 4px; }
.fiche-stamp-name { font-size: 9px; font-weight: 700; color: #dc2626; margin-top: 2px; }
.fiche-stamp-date { font-size: 7px; color: #991b1b; margin-top: 1px; }
.fiche-stamp-seal { display: inline-flex; align-items: center; gap: 4px; margin-top: 5px; background: rgba(220,38,38,0.06); border: 1.5px solid #dc2626; border-radius: 4px; padding: 2px 6px; }
.fiche-stamp-seal-text { font-size: 7px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.4px; }

/* ── Footer ───────────────────────────────────────────────────────── */
.fiche-footer { font-size: 7px; color: #64748b; text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); line-height: 1.4; }

/* ════════════════════════════════════════════════════════════════════════
   PRINT — clean black-on-white A4 with break-inside:avoid on all sections
   ════════════════════════════════════════════════════════════════════════ */
@media print {
  .no-print { display: none !important; }

  .fiche-document {
    color: #1f2937 !important;
    max-width: 100% !important;
  }

  /* ── Corporate header: white bg, dark text ────────── */
  .fiche-entet-logo, .fiche-entet-center, .fiche-entet-right {
    border-color: #cbd5e1 !important;
    background: white !important;
  }
  .fiche-entet-logo-title { color: #1e3a8a !important; }
  .fiche-entet-logo-title .accent { color: #ea580c !important; }
  .fiche-entet-logo-sub { color: #64748b !important; }
  .fiche-entet-company { color: #1e293b !important; }
  .fiche-entet-desc, .fiche-entet-capital { color: #475569 !important; }
  .fiche-entet-addr { color: #334155 !important; }
  .fiche-entet-tel, .fiche-entet-email, .fiche-entet-registry { color: #475569 !important; }
  .fiche-entet-web { color: #2563eb !important; }
  .fiche-entet-bank { color: #334155 !important; border-top-color: #cbd5e1 !important; }
  .fiche-entet-bank-label { color: #64748b !important; }
  .fiche-entet-divider { border-top-color: #cbd5e1 !important; }

  .fiche-doc-bar {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
  }
  .fiche-doc-title { color: #1e3a8a !important; }
  .fiche-doc-serial { color: #1e3a8a !important; }
  .fiche-doc-date { color: #64748b !important; }

  .fiche-section {
    background: #1e3a8a !important;
    color: white !important;
    border: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    break-inside: avoid;
  }

  .fiche-cell {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    break-inside: avoid;
  }
  .fiche-cell-label { color: #64748b !important; }
  .fiche-cell-value { color: #1f2937 !important; }

  .fiche-opt-badge {
    background: #ecfdf5 !important;
    border-color: #a7f3d0 !important;
  }
  .fiche-opt-none { color: #94a3b8 !important; }

  .fiche-stamp-cell { border-color: #94a3b8 !important; }
  .fiche-stamp-title { color: #64748b !important; }
  .fiche-stamp-ok { color: #059669 !important; }
  .fiche-stamp-wait { color: #94a3b8 !important; }
  .fiche-stamp-name { color: #dc2626 !important; }
  .fiche-stamp-date { color: #991b1b !important; }

  .fiche-remark { background: #fef2f2 !important; border-color: #fecaca !important; }
  .fiche-remark-title { color: #b91c1c !important; }
  .fiche-remark-item { color: #991b1b !important; }

  .fiche-footer { color: #64748b !important; border-top-color: #e2e8f0 !important; }

  /* ── Page break safety: prevent sections from splitting ── */
  .fiche-grid { break-inside: avoid; }
  .fiche-opt-grid { break-inside: avoid; }
  .fiche-stamp-table { break-inside: avoid; }
}

@page { margin: 8mm 10mm; size: A4 portrait; }
`

// ═══════════════════════════════════════════════════════════════════════════
//  CORPORATE HEADER — 3-column En-tête officiel
// ═══════════════════════════════════════════════════════════════════════════
function CorporateHeader() {
  return (
    <>
      <table className="fiche-entet">
        <tr>
          {/* COL 1: Logo + Company Name + Capital + Address */}
          <td className="fiche-entet-logo">
            <div className="fiche-entet-logo-title">
              RM<span className="accent">ASC</span>
            </div>
            <div className="fiche-entet-logo-sub">Ascenseurs &amp; Maintenance</div>
          </td>
          <td className="fiche-entet-center">
            <div className="fiche-entet-company">SARL RMASC</div>
            <div className="fiche-entet-desc">
              Conception, Etude &amp; Maintenance des Ascenseurs
            </div>
            <div className="fiche-entet-capital">
              Capital social : 30 000 000.00 DA
            </div>
            <div className="fiche-entet-addr">
              Zone d&rsquo;Activites ABBAS Boudjenane, Section 34, Ilot 96<br />
              El Esnam 10022 &mdash; Bouira
            </div>
          </td>
          <td className="fiche-entet-right">
            <div className="fiche-entet-tel">
              Tel: +213(0)26 844 194 / +213(0)26 722 354<br />
              Fax: +213(0)26 844 494 / +213(0)26 722 359<br />
              Mob: +213(0)555 500 300 / +213(0)550 380<br />
              &ensp;&ensp;&ensp;+213(0)555 906 963 / +213(0)550 813 316
            </div>
            <div className="fiche-entet-email">
              E-mail: sarl.rmasc@gmail.com / contact@sarlrmasc.com
            </div>
            <div className="fiche-entet-web">
              Site Web: www.sarlrmasc.com
            </div>
          </td>
        </tr>
      </table>

      {/* Registry + Banking — full-width second row */}
      <table className="fiche-entet" style={{marginTop:-1}}>
        <tr>
          <td style={{width:'50%',border:'1px solid rgba(255,255,255,0.12)',padding:'5px 8px',verticalAlign:'top'}}>
            <div className="fiche-entet-registry">
              RC : 09B0283424 &ensp;|&ensp; NIF : 000910028342411<br />
              NIS : 000910010011182 &ensp;|&ensp; ART : 10015008116
            </div>
          </td>
          <td style={{border:'1px solid rgba(255,255,255,0.12)',borderLeft:0,padding:'5px 8px',verticalAlign:'top'}}>
            <div className="fiche-entet-bank">
              <span className="fiche-entet-bank-label">Banque:</span> BEA Bouira n° 00200037037220034020<br />
              <span className="fiche-entet-bank-label">CCP BEA</span> n° 390021 Cle 60
            </div>
          </td>
        </tr>
      </table>

      <hr className="fiche-entet-divider" />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FICHE DOCUMENT — renders the actual spec sheet (zero emojis)
// ═══════════════════════════════════════════════════════════════════════════

function FicheDocument({ data }: { data: OrderFull }) {
  const opts = optsList(data)
  const vitesse = data.vitesseMs ? parseFloat(data.vitesseMs) : 0
  const nbreEtages = data.nombreEtages || '—'
  const d = data
  const hasNC = (d.profondeurCuvetteMm && parseInt(d.profondeurCuvetteMm) < 1400) ||
                (d.hauteurDernierEtageMm && parseInt(d.hauteurDernierEtageMm) < 3800)

  return (
    <div className="fiche-document">
      {/* ── OFFICIAL CORPORATE HEADER (En-tête) ── */}
      <CorporateHeader />

      {/* ── Document ID bar ── */}
      <div className="fiche-doc-bar">
        <div>
          <span className="fiche-doc-title">Fiche Technique Ascenseur</span>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="fiche-doc-serial">{data.serialNumber}</div>
          <div className="fiche-doc-date">{fmtDate(data.createdAt)}</div>
        </div>
      </div>

      {/* ═══════ 1. INFORMATIONS CLIENT ═══════ */}
      <div className="fiche-section">1. INFORMATIONS CLIENT</div>
      <div className="fiche-grid">
        <div className="fiche-cell">
          <div className="fiche-cell-label">Nom du client</div>
          <div className="fiche-cell-value">{data.clientName}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Ville</div>
          <div className="fiche-cell-value">{data.clientCity}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Email</div>
          <div className="fiche-cell-value">{data.clientEmail || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Telephone</div>
          <div className="fiche-cell-value">{data.clientPhone}</div>
        </div>
        {data.projectName && (
          <div className="fiche-cell fiche-cell-wide">
            <div className="fiche-cell-label">Projet</div>
            <div className="fiche-cell-value">{data.projectName}</div>
          </div>
        )}
      </div>

      {/* ═══════ 2. MOTORISATION ═══════ */}
      <div className="fiche-section">2. MOTORISATION</div>
      <div className="fiche-grid">
        <div className="fiche-cell">
          <div className="fiche-cell-label">Type</div>
          <div className="fiche-cell-value">{data.typeMotorisation}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Sous-type</div>
          <div className="fiche-cell-value">{data.sousTypeElectrique || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Vitesse</div>
          <div className="fiche-cell-value">{vitesse > 0 ? `${vitesse} m/s` : '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Etages</div>
          <div className="fiche-cell-value">{nbreEtages}</div>
        </div>
      </div>

      {/* ═══════ 3. DIMENSIONS (GAINE TECHNIQUE) ═══════ */}
      <div className="fiche-section">3. DIMENSIONS (GAINE TECHNIQUE)</div>
      <div className="fiche-grid">
        <div className="fiche-cell">
          <div className="fiche-cell-label">Largeur gaine</div>
          <div className="fiche-cell-value">{data.largeurGaineMm} mm</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Profondeur gaine</div>
          <div className="fiche-cell-value">{data.profondeurGaineMm} mm</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Hauteur gaine</div>
          <div className="fiche-cell-value">{data.hauteurGaineMm} mm</div>
        </div>
      </div>

      {/* ═══════ 4. MATERIAUX & FINITIONS ═══════ */}
      <div className="fiche-section">4. MATERIAUX &amp; FINITIONS</div>
      <div className="fiche-grid">
        <div className="fiche-cell">
          <div className="fiche-cell-label">Cabine</div>
          <div className="fiche-cell-value">{data.materiauCabine || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Portes</div>
          <div className="fiche-cell-value">{data.materiauPortes || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Finition portes</div>
          <div className="fiche-cell-value">{fmt(data.finitionPorteCabine)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Finition interieur</div>
          <div className="fiche-cell-value">{fmt(data.finitionInterieurCabine)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Parois</div>
          <div className="fiche-cell-value">{data.materiauParois || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Revetement sol</div>
          <div className="fiche-cell-value">{fmt(data.revetementSol)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Materiau sol</div>
          <div className="fiche-cell-value">{data.materiauSol || '—'}</div>
        </div>
      </div>

      {/* ═══════ 5. COMPOSANTS MECANIQUES ═══════ */}
      <div className="fiche-section">5. COMPOSANTS MECANIQUES</div>
      <div className="fiche-grid">
        <div className="fiche-cell">
          <div className="fiche-cell-label">Type cabine</div>
          <div className="fiche-cell-value">{fmt(data.typeCabine)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Chassis</div>
          <div className="fiche-cell-value">{fmt(data.typeChassisArcade)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Portes palieres</div>
          <div className="fiche-cell-value">{fmt(data.typePorte) || '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Passage libre</div>
          <div className="fiche-cell-value">{data.largeurPassageLibreMm ? `${data.largeurPassageLibreMm} mm` : '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Hauteur utile</div>
          <div className="fiche-cell-value">{data.hauteurUtileCabineMm ? `${data.hauteurUtileCabineMm} mm` : '—'}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Suspension / Guidage</div>
          <div className="fiche-cell-value">{fmt(data.typeSuspensionGuidage)}</div>
        </div>
        <div className="fiche-cell">
          <div className="fiche-cell-label">Systeme surcharge</div>
          <div className="fiche-cell-value">{fmt(data.systemeSurcharge)}</div>
        </div>
      </div>

      {/* ═══════ 6. OPTIONS & ACCESSOIRES ═══════ */}
      <div className="fiche-section">6. OPTIONS &amp; ACCESSOIRES</div>
      <div className="fiche-opt-grid">
        {opts.length === 0 ? (
          <div className="fiche-opt-none">Aucune option</div>
        ) : (
          opts.map((o, i) => (
            <span key={i} className="fiche-opt-badge">{o}</span>
          ))
        )}
      </div>

      {/* ═══════ NOTES (if any) ═══════ */}
      {data.notes && (
        <div className="fiche-remark">
          <div className="fiche-remark-title">NOTICE &mdash; Information importante</div>
          <div className="fiche-remark-item">{data.notes}</div>
        </div>
      )}

      {/* ═══════ NON-CONFORMITES NF EN 81-20 ═══════ */}
      {hasNC && (
        <div className="fiche-remark">
          <div className="fiche-remark-title">Non-Conformites NF EN 81-20</div>
          {d.profondeurCuvetteMm && parseInt(d.profondeurCuvetteMm) < 1400 && (
            <div className="fiche-remark-item">
              Profondeur cuvette insuffisante ({d.profondeurCuvetteMm} mm) &mdash; Minimum requis : 1400 mm
            </div>
          )}
          {d.hauteurDernierEtageMm && parseInt(d.hauteurDernierEtageMm) < 3800 && (
            <div className="fiche-remark-item">
              Hauteur sous dalle insuffisante ({d.hauteurDernierEtageMm} mm) &mdash; Minimum requis : 3800 mm
            </div>
          )}
        </div>
      )}

      {/* ═══════ 7. APPROBATIONS & CACHETS ═══════ */}
      <div className="fiche-section" style={{marginTop:14}}>7. APPROBATIONS &amp; CACHETS</div>
      <table className="fiche-stamp-table"><tr>
        <td className="fiche-stamp-cell">
          <div className="fiche-stamp-title">Plan d&rsquo;Installation</div>
          {data.approvedBy ? (
            <div style={{textAlign:'center',marginTop:4}}>
              <div className="fiche-stamp-ok">Approuve</div>
              <div className="fiche-stamp-name">{data.approvedBy}</div>
              <div className="fiche-stamp-date">
                {data.approvedAt ? fmtDate(data.approvedAt) : ''}
              </div>
              {data.isStamped && (
                <div className="fiche-stamp-seal">
                  <span className="fiche-stamp-seal-text">Cachet electronique applique</span>
                </div>
              )}
            </div>
          ) : (
            <div className="fiche-stamp-wait">En attente...</div>
          )}
        </td>
        <td className="fiche-stamp-cell">
          <div className="fiche-stamp-title">Dessin 2D Cabine</div>
          {data.cadSubmissions?.some(s => s.engineeringType === 'DESSIN_TECH_2' && s.status === 'APPROUVE')
            ? <div className="fiche-stamp-ok">Approuve</div>
            : <div className="fiche-stamp-wait">En attente...</div>}
        </td>
      </tr></table>

      {/* ── Electronic Stamp detail ── */}
      {data.isStamped && (
        <div className="fiche-remark" style={{borderColor:'rgba(220,38,38,0.2)',background:'rgba(220,38,38,0.03)',marginTop:6}}>
          <div className="fiche-remark-title" style={{color:'#dc2626'}}>Cachet Electronique de Validation S.A.R.L RMASC</div>
          <div className="fiche-remark-item" style={{color:'#991b1b'}}>
            Approuve par <b>{data.stampedBy || data.approvedBy}</b>
            {data.stampedAt && <> &mdash; Le {fmtDateTime(data.stampedAt)}</>}
          </div>
          {data.stampResults && data.stampResults.length > 0 && (
            <div className="fiche-remark-item" style={{fontSize:7,color:'#7f1d1d',marginTop:2}}>
              {data.stampResults.filter((r: any) => r.success).length}/{data.stampResults.length}
              {data.stampResults.reduce((sum: number, r: any) => sum + (r.pagesStamped || 0), 0) > 0 && (
                <> ({data.stampResults.reduce((sum: number, r: any) => sum + (r.pagesStamped || 0), 0)} page(s) marquee(s))</>
              )}
            </div>
          )}
        </div>
      )}

      <div className="fiche-footer">
        Document genere automatiquement par RMASC ERP<br />
        N° {data.serialNumber} &mdash; {fmtDate(data.createdAt)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function FicheTechniqueView({ orderId, onBack, variant }: { orderId: string; onBack?: () => void; variant?: 'full' | 'inline' }) {
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

    const ficheHtml = docRef.current?.innerHTML || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Fiche Technique &mdash; ${data.serialNumber}</title>
        <style>${FICHE_STYLES}</style>
      </head>
      <body style="margin:0 auto;font-family:Arial,sans-serif;">
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

  const isInline = variant === 'inline'

  if (loading) {
    const spinner = (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-white/10 border-t-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/50">Generation de la Fiche Technique...</p>
        </div>
      </div>
    )
    if (isInline) return <div className="bg-slate-800/70 rounded-xl border border-white/10 p-6">{spinner}</div>
    return <div className="flex items-center justify-center min-h-screen bg-slate-950">{spinner}</div>
  }

  if (error || !data) {
    const errorBox = (
      <div className="text-center max-w-md mx-auto px-6 py-12">
        <p className="text-sm text-red-600 font-medium mb-2">{error || 'Fiche technique introuvable'}</p>
        <p className="text-xs text-white/70 mb-4">Verifiez que la commande existe et que les donnees sont completes.</p>
        {onBack && <button onClick={onBack} className="text-xs text-blue-600 underline font-medium">&larr; Retour</button>}
      </div>
    )
    if (isInline) return <div className="bg-slate-800/70 rounded-xl border border-white/10 p-6">{errorBox}</div>
    return <div className="flex items-center justify-center min-h-screen bg-slate-950">{errorBox}</div>
  }

  if (isInline) {
    if (!data || !data.serialNumber) {
      return (
        <div className="bg-slate-800/70 rounded-xl border border-white/10 p-6">
          <div className="text-center py-8">
            <p className="text-sm text-white/80">Impossible de charger la fiche technique.</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-xs text-amber-400 underline">Recharger</button>
          </div>
        </div>
      )
    }
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-lg">
        <style>{FICHE_STYLES}</style>
        {/* Inline toolbar — hidden on print */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.03] no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Fiche Technique</span>
            <span className="text-xs font-mono text-white/70 bg-white/[0.06] px-2 py-0.5 rounded">{data.serialNumber}</span>
          </div>
          <button onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 no-print">
            PDF
          </button>
        </div>
        {/* Document body */}
        <div className="p-6" ref={docRef}>
          <FicheDocument data={data} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      <style>{FICHE_STYLES}</style>
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/70 hover:text-white transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-white">Fiche Technique</h1>
          <span className="text-xs font-mono text-white/70 bg-white/[0.06] px-2.5 py-1 rounded">{data.serialNumber}</span>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold transition-all shadow-lg shadow-amber-500/25 no-print">
          Imprimer / PDF
        </button>
      </div>
      <div className="py-8 px-4 md:px-8 flex justify-center no-print">
        <div className="bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-2xl w-full max-w-[210mm] border border-white/5">
          <div className="p-6 md:p-8" ref={docRef}>
            <FicheDocument data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
