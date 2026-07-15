import { useState, useMemo, useEffect, useRef } from 'react'
import { apiFetch } from '../config/api'

// ─── Serial Number Generation ──────────────────────────────────────────────
// CLIENT-SIDE FALLBACK REMOVED — the server now generates ASC-XXX-MM-YY
// format when the serial field is left empty. See backend/api.mjs and
// dist/controllers/create-and-sync.controller.js for the implementation.

// ─── Types ─────────────────────────────────────────────────────────────────
type StepKey = 'client' | 'motorisation' | 'dimensions' | 'materiaux' | 'options' | 'finalisation'

interface FormData {
  serialNumber: string; projectName: string; priority: string
  clientName: string; clientEmail: string; clientPhone: string; clientPhone2: string; clientCity: string
  motorType: string; motorSubtype: string; motorSpeed: string; motorFloors: string
  dimWidth: string; dimDepth: string; dimHeight: string
  pitDepth: string; topFloorHeight: string; contrepoidsPosition: string
  largeurPassageLibre: string; hauteurUtileCabine: string
  typeSuspensionGuidage: string; systemeSurcharge: string
  matCabin: string; matDoors: string; matWalls: string; matSol: string
  typeCabine: string; typePorte: string; finitionPorteCabine: string
  typeChassisArcade: string; finitionInterieurCabine: string; revetementSol: string
  optPanoramic: boolean; optBackupPower: boolean; optVoiceAnnounce: boolean
  optCctv: boolean; optFireDoors: boolean; optTouchPanel: boolean
  optVentilation: boolean; optBarreaudage: boolean; optAlarme: boolean
  notes: string; agreed: boolean
  // ── Custom "Autre" text overrides ──────────────────────────────────────
  customMatCabin: string; customMatDoors: string; customMatWalls: string
  customMatSol: string; customTypeCabine: string; customTypePorte: string
  customFinitionPorte: string; customChassis: string; customFinitionInterieur: string
  customRevetementSol: string; customSuspension: string; customSurcharge: string
}

interface StepInfo { key: StepKey; label: string; icon: string }

const STEPS: StepInfo[] = [
  { key: 'client', label: 'Client', icon: 'User' },
  { key: 'motorisation', label: 'Motorisation', icon: 'Zap' },
  { key: 'dimensions', label: 'Dimensions', icon: 'Ruler' },
  { key: 'materiaux', label: 'Matériaux', icon: 'Layers' },
  { key: 'options', label: 'Options', icon: 'CheckSquare' },
  { key: 'finalisation', label: 'Finalisation', icon: 'FileCheck' },
]

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: '🔴 Urgent', color: 'text-red-600 bg-red-50' },
  { value: 'HAUTE', label: '🟠 Haute', color: 'text-orange-600 bg-orange-50' },
  { value: 'NORMAL', label: '🔵 Normal', color: 'text-blue-600 bg-blue-50' },
  { value: 'BASSE', label: '🟢 Basse', color: 'text-green-600 bg-green-50' },
]

const INITIAL_FORM: FormData = {
  serialNumber: '', projectName: '', priority: 'NORMAL',
  clientName: '', clientEmail: '', clientPhone: '', clientPhone2: '', clientCity: '',
  motorType: 'ÉLECTRIQUE', motorSubtype: '', motorSpeed: '', motorFloors: '',
  dimWidth: '', dimDepth: '', dimHeight: '',
  pitDepth: '', topFloorHeight: '', contrepoidsPosition: 'Fond',
  largeurPassageLibre: '', hauteurUtileCabine: '',
  typeSuspensionGuidage: '', systemeSurcharge: '',
  matCabin: '', matDoors: '', matWalls: '',
  typeCabine: '', typePorte: '', finitionPorteCabine: '',
  typeChassisArcade: '', finitionInterieurCabine: '', revetementSol: '',
  optPanoramic: false, optBackupPower: false, optVoiceAnnounce: false,
  optCctv: false, optFireDoors: false, optTouchPanel: false,
  optVentilation: false, optBarreaudage: false, optAlarme: false,
  notes: '', agreed: false,
  customMatCabin: '', customMatDoors: '', customMatWalls: '',
  customMatSol: '', customTypeCabine: '', customTypePorte: '',
  customFinitionPorte: '', customChassis: '', customFinitionInterieur: '',
  customRevetementSol: '', customSuspension: '', customSurcharge: '',
}

// ─── Catalog Options ──────────────────────────────────────────────────────
const CABIN_WALL_MATERIALS = [
  'Acier Inoxydable Brossé', 'Acier Inoxydable Miroir', 'Inox Inoxydable',
  'Inox Inoxydable + Galvanisé',
  'Verre Trempé (Stratifié 12mm)',
  'Aluminium', 'Méthacrylate', 'Bois Décoratif Ignifuge', 'Mélaminé / Laminé Haute Pression',
]
const DOOR_MATERIALS = ['Acier Inoxydable Brossé', 'Acier Inoxydable Miroir', 'Verre Trempé']

const TYPE_CABINE_OPTIONS = [
  { value: 'PASSAGER', label: '🚶 Standard Passager', desc: 'Cabine passager standard' },
  { value: 'PANORAMIQUE', label: '🪟 Panoramique', desc: 'Cabine panoramique avec parois vitrées' },
  { value: 'CHARGES_LOURDES', label: '🏋️ Monte-Charge', desc: 'Cabine renforcée pour marchandises lourdes' },
  { value: 'SERVICE_LIFT', label: '📦 Monte-Plat', desc: 'Cabine de service' },
]
const TYPE_PORTE_OPTIONS = [
  { value: 'AUTOMATIQUE_CENTRALE', label: '🚪 Automatique Centrale (2V)', desc: 'Ouverture centrale 2 vantaux' },
  { value: 'AUTOMATIQUE_TELESCOPIQUE', label: '🚪🔀 Télescopique', desc: 'Ouverture télescopique' },
  { value: 'BATTANTE_MANUELLE', label: '🚪✋ Battante Manuelle', desc: 'Porte battante pour service' },
]
const FINITION_PORTE_CABINE_OPTIONS = [
  { value: 'INOX_BROSSE', label: 'Inox Brossé', desc: 'Aspect mat et élégant' },
  { value: 'INOX_MIROIR', label: 'Inox Miroir', desc: 'Aspect brillant et luxueux' },
  { value: 'INOX_TEXTURE', label: 'Inox Texturé', desc: 'Texture antidérapante' },
  { value: 'VITREE_PANORAMIQUE', label: 'Vitrée Panoramique', desc: 'Porte entièrement vitrée' },
]
const TYPE_CHASSIS_ARCADE_OPTIONS = [
  { value: 'TRACTION_ELECTRIQUE_2_1', label: '⚡ Traction Électrique 2:1', desc: 'Avantage mécanique 2:1' },
  { value: 'TRACTION_ELECTRIQUE_1_1', label: '⚡ Traction Électrique 1:1', desc: 'Architecture directe 1:1' },
  { value: 'HYDRAULIQUE_DIRECT', label: '💧 Hydraulique Direct', desc: 'Vérin hydraulique direct' },
  { value: 'HYDRAULIQUE_INDIRECT_RUCKSACK', label: '💧 Hydraulique Indirect (Rucksack)', desc: 'Vérin latéral Rucksack' },
]
const FINITION_INTERIEUR_CABINE_OPTIONS = [
  { value: 'INOX MIROIR', label: 'INOX MIROIR', desc: 'Finition inox miroir' },
  { value: 'INOX MIROIR ET SATINÉ', label: 'INOX MIROIR ET SATINÉ', desc: 'Finition mixte miroir et satiné' },
  { value: 'INOX DÉCORÉ', label: 'INOX DÉCORÉ', desc: 'Finition inox avec motifs décoratifs' },
]
const REVETEMENT_SOL_OPTIONS = [
  { value: 'GRANIT NATUREL', label: 'GRANIT NATUREL', desc: 'Granit naturel haut de gamme' },
  { value: 'MARBRE NATUREL', label: 'MARBRE NATUREL', desc: 'Marbre naturel prestige' },
  { value: 'ALUMINIUM', label: 'ALUMINIUM', desc: 'Aluminium léger et durable' },
  { value: 'ALUMINIUM STRIÉ', label: 'ALUMINIUM STRIÉ', desc: 'Aluminium strié antidérapant' },
  { value: 'TÔLE STRIÉE', label: 'TÔLE STRIÉE', desc: 'Tôle striée haute résistance' },
  { value: 'TAPIS ANTIBACTÉRIEN', label: 'TAPIS ANTIBACTÉRIEN', desc: 'Tapis antibactérien confort' },
]
const TYPE_SUSPENSION_OPTIONS = [
  { value: 'PATINS_COULISSANTS', label: '🛤️ Patins Coulissants', desc: 'Patins de guidage coulissants' },
  { value: 'GALETS_ROULANTS', label: '⚙️ Galets Roulants', desc: 'Galets de guidage roulants' },
]
const SYSTEME_SURCHARGE_OPTIONS = [
  { value: 'CELLULES_SOUS_CABINE', label: '📡 Cellules Sous Cabine', desc: 'Cellules de détection de charge' },
  { value: 'CAPTEUR_SUR_CABLE', label: '🔗 Capteur sur Câble', desc: 'Capteur de tension sur câble' },
]

const CONTREPOIDS_POSITION_OPTIONS = [
  { value: 'Fond', label: '🔙 Contrepoids au Fond', desc: 'Configuration standard pour gaines profondes' },
  { value: 'Latéral', label: '↔️ Contrepoids Latéral', desc: 'Idéal pour gaines étroites' },
]
const MOTEUR_SUBTYPE_OPTIONS = [
  { value: 'Sans local (Gearless)', label: '⚡ Gearless', desc: 'Moteur synchrone à aimants permanents' },
  { value: 'Avec local (Gearbox)', label: '⚙️ Gearbox', desc: 'Moteur asynchrone avec réducteur' },
]
const TYPE_PORTE_INSTALLATION_OPTIONS = [
  { value: 'AUTOMATIQUE_CENTRALE', label: '🚪 Centrale (2V)', desc: 'Ouverture centrale 2 vantaux' },
  { value: 'AUTOMATIQUE_TELESCOPIQUE', label: '🚪🔀 Télescopique', desc: 'Ouverture télescopique' },
  { value: 'BATTANTE_MANUELLE', label: '🚪✋ Battante Manuelle', desc: 'Porte battante pour service' },
]

const PASSAGE_LIBRE_OPTIONS = ['600', '700', '800', '900', '1000', '1100', '1200']
const HAUTEUR_UTILE_OPTIONS = ['2100', '2200', '2300', '2400']

// ─── NF EN 81-20/50 Constants ──────────────────────────────────────────
const E_CP = 250; const E_GUIDES_PATTES = 90; const J_SECURITE = 25
const E_PORTE_CENTRALE = 180; const E_PORTE_TELESCOPIQUE = 100; const E_PORTE_BATTANTE = 100
const PENALITE_GEARBOX = 40; const PENALITE_HYDRAULIQUE = 45; const E_RESERVE_TECHNIQUE = 120

function computeSalimLc(Lg: number, cp: string, sub: string, mt: string): number {
  const gb = sub === 'Avec local (Gearbox)' ? PENALITE_GEARBOX : 0
  const hy = mt === 'HYDRAULIQUE' ? PENALITE_HYDRAULIQUE : 0; const p = gb + hy
  return cp === 'Fond'
    ? Math.max(0, Lg - 2*E_GUIDES_PATTES - 2*J_SECURITE - E_RESERVE_TECHNIQUE - p)
    : Math.max(0, Lg - 2*E_GUIDES_PATTES - E_CP - 2*J_SECURITE - E_RESERVE_TECHNIQUE - p)
}
function computeSalimPc(Pg: number, cp: string, tp: string, sub: string, mt: string): number {
  const isC = tp === 'AUTOMATIQUE_CENTRALE'; const isB = tp === 'BATTANTE_MANUELLE'
  const e = isC ? E_PORTE_CENTRALE : isB ? E_PORTE_BATTANTE : E_PORTE_TELESCOPIQUE
  const gb = sub === 'Avec local (Gearbox)' ? PENALITE_GEARBOX : 0
  const hy = mt === 'HYDRAULIQUE' ? PENALITE_HYDRAULIQUE : 0; const p = gb + hy
  return cp === 'Fond'
    ? Math.max(0, Pg - e - E_CP - E_GUIDES_PATTES - J_SECURITE - E_RESERVE_TECHNIQUE - p)
    : Math.max(0, Pg - e - J_SECURITE - E_RESERVE_TECHNIQUE - p)
}

function useSalimHamounAI(dW: string, dD: string, cp: string, tp: string, ms: string, mt: string) {
  return useMemo(() => {
    const Lg = parseFloat(dW); const Pg = parseFloat(dD)
    if (!(!isNaN(Lg) && Lg > 0 && !isNaN(Pg) && Pg > 0))
      return { estimatedCabinWidth: null, estimatedCabinDepth: null, isActive: false, deductionLabel: '', deductionDetails: [], positionCp: cp, porteType: '', moteurType: '', penaltyApplied: false, penaltyValue: 0, penaltyGB: 0, penaltyH: 0, isHydraulic: false }

    const isC = tp === 'AUTOMATIQUE_CENTRALE'; const isB = tp === 'BATTANTE_MANUELLE'
    const pL = isC ? 'Centrale' : isB ? 'Battante' : 'Télescopique'
    const eP = isC ? E_PORTE_CENTRALE : isB ? E_PORTE_BATTANTE : E_PORTE_TELESCOPIQUE
    const gb = ms === 'Avec local (Gearbox)'
    const hy = mt === 'HYDRAULIQUE'
    const mL = hy ? 'Hydraulique' : gb ? 'Gearbox' : 'Gearless'
    const pGB = gb ? PENALITE_GEARBOX : 0; const pH = hy ? PENALITE_HYDRAULIQUE : 0; const pT = pGB + pH
    const dd: string[] = []; let dl = ''

    let Lr: number; let Pr: number
    if (cp === 'Fond') {
      Lr = Lg - 2*E_GUIDES_PATTES - 2*J_SECURITE - E_RESERVE_TECHNIQUE
      Pr = Pg - eP - E_CP - E_GUIDES_PATTES - J_SECURITE - E_RESERVE_TECHNIQUE
      dl = `CP au Fond — Porte ${pL} — ${mL}`
      dd.push(`Lc: ${Lg}−2×${E_GUIDES_PATTES}−2×${J_SECURITE}−${E_RESERVE_TECHNIQUE}=${Math.round(Lr)} mm`)
      dd.push(`Pc: ${Pg}−${eP}−${E_CP}−${E_GUIDES_PATTES}−${J_SECURITE}−${E_RESERVE_TECHNIQUE}=${Math.round(Pr)} mm`)
    } else {
      Lr = Lg - 2*E_GUIDES_PATTES - E_CP - 2*J_SECURITE - E_RESERVE_TECHNIQUE
      Pr = Pg - eP - J_SECURITE - E_RESERVE_TECHNIQUE
      dl = `CP Latéral — Porte ${pL} — ${mL}`
      dd.push(`Lc: ${Lg}−2×${E_GUIDES_PATTES}−${E_CP}−2×${J_SECURITE}−${E_RESERVE_TECHNIQUE}=${Math.round(Lr)} mm`)
      dd.push(`Pc: ${Pg}−${eP}−${J_SECURITE}−${E_RESERVE_TECHNIQUE}=${Math.round(Pr)} mm`)
    }
    const Lc = Math.max(0, Lr - pT); const Pc = Math.max(0, Pr - pT)
    if (pT > 0) dd.push(`Pénalités: ${[gb && `Gearbox −${PENALITE_GEARBOX}`, hy && `Hydraulique −${PENALITE_HYDRAULIQUE}`].filter(Boolean).join(' + ')}`)
    return {
      estimatedCabinWidth: `${Math.round(Lc)} mm`, estimatedCabinDepth: `${Math.round(Pc)} mm`,
      isActive: true, deductionLabel: dl, deductionDetails: dd,
      positionCp: cp, porteType: pL, moteurType: mL,
      penaltyApplied: gb||hy, penaltyValue: pT, penaltyGB: pGB, penaltyH: pH, isHydraulic: hy,
    }
  }, [dW, dD, cp, tp, ms, mt])
}

// ─── Form persistence (UX only — survives page refresh during editing) ────
const FORM_KEY = 'rmasc_pending_elevator_form'
const STEP_KEY = 'rmasc_pending_elevator_step'

function hydrate(): { data: FormData; step: number } {
  try {
    const d = localStorage.getItem(FORM_KEY); const s = localStorage.getItem(STEP_KEY)
    return {
      data: d ? { ...INITIAL_FORM, ...JSON.parse(d) } : INITIAL_FORM,
      step: s ? Math.min(Math.max(0, parseInt(s)), STEPS.length - 1) : 0,
    }
  } catch { return { data: INITIAL_FORM, step: 0 } }
}

// ─── Icon ─────────────────────────────────────────────────────────────────
function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const p = { className, strokeWidth: 1.5 as const, fill: 'none' as const }
  const svgs: Record<string, JSX.Element> = {
    User: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    Zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    Ruler: <path d="M16 2v20M4 12h12M4 8h8M4 16h10M2 6v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>,
    Layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></>,
    CheckSquare: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    FileCheck: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></>,
    ArrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    ArrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    Check: <polyline points="20 6 9 17 4 12"/>,
    AlertCircle: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    Calculator: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></>,
  }
  return <svg {...p} viewBox="0 0 24 24" stroke="currentColor">{svgs[name] || <circle cx="12" cy="12" r="10"/>}</svg>
}

// ─── Form components ──────────────────────────────────────────────────────
function FormInput({ label, value, onChange, type = 'text', placeholder, required = false, optional = false }: any) {
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}{optional && <span className="text-gray-400 text-[11px] font-normal italic">(Optionnel)</span>}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-10 px-3.5 rounded-xl border bg-slate-700/60 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all border-slate-600/50"/>
  </div>
}
function FormSelect({ label, value, onChange, options, required = false }: any) {
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-slate-600/50 bg-slate-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all appearance-none">
      <option value="" disabled>Sélectionner...</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
}
function FormSelectRich({ label, value, onChange, options, required = false }: any) {
  const s = options.find((o: any) => o.value === value)
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-slate-600/50 bg-slate-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all appearance-none">
      <option value="" disabled>Selectionner...</option>
      {options.map((o: any) => <option key={o.value} value={o.value} title={o.desc}>{o.label}</option>)}
    </select>
    {s && <p className="text-[11px] text-gray-400 italic mt-0.5 leading-tight">{s.desc}</p>}
  </div>
}

// ─── Select with "Autre" (Other) — dynamic custom text input ──────────────
function FormSelectWithAutre({ label, value, onChange, options, customValue, onCustomChange, placeholder, required = false }: any) {
  const isAutre = value === 'AUTRE'
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={isAutre ? 'AUTRE' : value} onChange={e => onChange(e.target.value === 'AUTRE' ? 'AUTRE' : e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-slate-600/50 bg-slate-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all appearance-none">
      <option value="" disabled>Selectionner...</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      <option value="AUTRE">— Autre (specifier) —</option>
    </select>
    {isAutre && (
      <input type="text" value={customValue} onChange={e => onCustomChange(e.target.value)}
        placeholder={placeholder || 'Saisir la valeur personnalisee...'}
        className="w-full h-10 px-3.5 rounded-xl border border-amber-500/40 bg-slate-800/80 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all" />
    )}
  </div>
}

function FormSelectRichWithAutre({ label, value, onChange, options, customValue, onCustomChange, placeholder, required = false }: any) {
  const s = options.find((o: any) => o.value === value)
  const isAutre = value === 'AUTRE'
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={isAutre ? 'AUTRE' : value} onChange={e => onChange(e.target.value === 'AUTRE' ? 'AUTRE' : e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-slate-600/50 bg-slate-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all appearance-none">
      <option value="" disabled>Selectionner...</option>
      {options.map((o: any) => <option key={o.value} value={o.value} title={o.desc}>{o.label}</option>)}
      <option value="AUTRE">— Autre (specifier) —</option>
    </select>
    {!isAutre && s && <p className="text-[11px] text-gray-400 italic mt-0.5 leading-tight">{s.desc}</p>}
    {isAutre && (
      <input type="text" value={customValue} onChange={e => onCustomChange(e.target.value)}
        placeholder={placeholder || 'Saisir la valeur personnalisee...'}
        className="w-full h-10 px-3.5 rounded-xl border border-amber-500/40 bg-slate-800/80 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all" />
    )}
  </div>
}
function FormSelectNum({ label, value, onChange, options, suffix = '', required = false }: any) {
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-slate-600/50 bg-slate-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all appearance-none">
      <option value="" disabled>Sélectionner...</option>
      {options.map((o: string) => <option key={o} value={o}>{o}{suffix ? ` ${suffix}` : ''}</option>)}
    </select>
  </div>
}
function FormCheckbox({ label, checked, onChange }: any) {
  return <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition-all cursor-pointer group">
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-amber-500 border-amber-500' : 'border-slate-500 group-hover:border-slate-400'}`}>
      {checked && <Icon name="Check" className="w-3.5 h-3.5 text-white" />}
    </div>
    <span className="text-sm font-medium text-gray-200 select-none">{label}</span>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
  </label>
}

// ─── Validation ───────────────────────────────────────────────────────────
function areClientFieldsFilled(d: FormData) { return d.clientName.trim() !== '' && d.clientPhone.trim() !== '' && d.clientCity.trim() !== '' && d.serialNumber.trim() !== '' }
function isFinalisationValid(d: FormData) { return areClientFieldsFilled(d) && d.agreed === true }

// ─── Step 1: Client ───────────────────────────────────────────────────────
function StepClient({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Informations de la commande.</p>
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><FormInput label="Nom du client" value={data.clientName} onChange={s('clientName')} placeholder="Ex: Ascenseurs Bouira" required /></div>
      <FormInput label="Email" value={data.clientEmail} onChange={s('clientEmail')} placeholder="contact@client.com" type="email" optional />
      <FormInput label="Téléphone" value={data.clientPhone} onChange={s('clientPhone')} placeholder="+213..." type="tel" required />
      <FormInput label="Téléphone 2" value={data.clientPhone2} onChange={s('clientPhone2')} placeholder="+213..." type="tel" optional />
      <FormInput label="Ville" value={data.clientCity} onChange={s('clientCity')} placeholder="Ex: Bouira" required />
    </div>
    <div className="border-t border-white/5 pt-3 mt-2">
      <div className="col-span-2"><FormInput label="Nom du projet" value={data.projectName} onChange={s('projectName')} placeholder="Ex: Résidence El Manar Bâtiment B" optional /></div>
    </div>
    <div className="border-t border-slate-600/30 pt-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">⚙️ Configuration & Priorité</p>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="N° de série" value={data.serialNumber} onChange={s('serialNumber')} placeholder="Laisser vide pour génération auto (Format: ASC-001-MM-YY)" optional />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-200 flex items-center gap-1.5">Priorité <span className="text-red-400 text-xs">*</span></label>
          <div className="flex gap-2 h-10">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p.value} type="button" onClick={() => setData({ ...data, priority: p.value })}
                className={`flex-1 rounded-xl text-xs font-bold border-2 transition-all ${data.priority === p.value ? `${p.color} border-current` : 'border-slate-600/50 text-gray-400 bg-slate-700/40 hover:border-slate-500'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
}

// ─── Step 2: Motorisation ─────────────────────────────────────────────────
function StepMotorisation({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Configurez le système de motorisation.</p>
    <div className="grid grid-cols-2 gap-4">
      <FormSelect label="Type de motorisation" value={data.motorType} onChange={(v: string) => setData({ ...data, motorType: v })} options={['ÉLECTRIQUE', 'HYDRAULIQUE']} />
      <FormInput label="Vitesse (m/s)" value={data.motorSpeed} onChange={s('motorSpeed')} placeholder="Ex: 1.5" type="number" />
      <FormInput label="Nombre d'étages" value={data.motorFloors} onChange={s('motorFloors')} placeholder="Ex: 6" type="number" />
    </div>
    {/* Spécifications Structurelles — déplacé de Dimensions vers Motorisation */}
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">⚙</div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Spécifications Structurelles</span>
        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">SH AI</span>
      </div>
      <div className="grid gap-3 grid-cols-3">
        <FormSelectRich label="Type de moteur" value={data.motorSubtype} onChange={s('motorSubtype')} options={MOTEUR_SUBTYPE_OPTIONS} />
        <FormSelectRich label="Position contrepoids" value={data.contrepoidsPosition} onChange={s('contrepoidsPosition')} options={CONTREPOIDS_POSITION_OPTIONS} />
        <FormSelectRich label="Type de porte palière" value={data.typePorte} onChange={s('typePorte')} options={TYPE_PORTE_INSTALLATION_OPTIONS} />
      </div>
    </div>

    <hr className="border-slate-600/30" />
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-600 flex items-center justify-center text-white text-[10px] font-bold">⚙</div><p className="text-sm font-semibold text-gray-200">Spécifications Mécaniques</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectNum label="Largeur passage libre (PL)" value={data.largeurPassageLibre} onChange={s('largeurPassageLibre')} options={PASSAGE_LIBRE_OPTIONS} suffix="mm" />
      <FormSelectNum label="Hauteur utile cabine" value={data.hauteurUtileCabine} onChange={s('hauteurUtileCabine')} options={HAUTEUR_UTILE_OPTIONS} suffix="mm" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectRichWithAutre label="Type suspension / guidage" value={data.typeSuspensionGuidage} onChange={s('typeSuspensionGuidage')} options={TYPE_SUSPENSION_OPTIONS}
        customValue={data.customSuspension} onCustomChange={s('customSuspension')} placeholder="Ex: Rails renforces..." />
      <FormSelectRichWithAutre label="Systeme de surcharge" value={data.systemeSurcharge} onChange={s('systemeSurcharge')} options={SYSTEME_SURCHARGE_OPTIONS}
        customValue={data.customSurcharge} onCustomChange={s('customSurcharge')} placeholder="Ex: Pesage electronique..." />
    </div>
  </div>
}

// ─── Step 3: Dimensions ───────────────────────────────────────────────────
function StepDimensions({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  const { estimatedCabinWidth, estimatedCabinDepth, isActive, deductionLabel, deductionDetails, positionCp, porteType, moteurType, penaltyApplied, penaltyValue, penaltyGB, penaltyH } = useSalimHamounAI(data.dimWidth, data.dimDepth, data.contrepoidsPosition, data.typePorte, data.motorSubtype, data.motorType)
  const pN = parseFloat(data.pitDepth); const pW = data.pitDepth !== '' && !isNaN(pN) && pN < 500
  const tN = parseFloat(data.topFloorHeight); const tW = data.topFloorHeight !== '' && !isNaN(tN) && tN < 2300
  const isE = data.motorType === 'ÉLECTRIQUE'

  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Dimensions de la gaine technique en millimètres.</p>
    <div className="grid grid-cols-2 gap-4">
      <FormInput label="Largeur gaine (mm)" value={data.dimWidth} onChange={s('dimWidth')} placeholder="Ex: 1600" type="number" />
      <FormInput label="Profondeur gaine (mm)" value={data.dimDepth} onChange={s('dimDepth')} placeholder="Ex: 1800" type="number" />
      <FormInput label="Hauteur de la gaine (mm)" value={data.dimHeight} onChange={s('dimHeight')} placeholder="Ex: 3600" type="number" />
    </div>

    {/* SH AI Calculator */}
    {isActive && <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"><span className="text-sm font-black text-white">SH</span></div>
          <div><span className="text-xs font-bold uppercase tracking-wider text-slate-300">Salim Hamoun AI v1.0</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">EN 81-20/50</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Temps Réel</span>
          </div></div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">CP {positionCp === 'Fond' ? 'au Fond' : 'Latéral'}</span>
          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">Porte {porteType} · {moteurType}</span>
        </div>
      </div>
      <div className="bg-slate-800/60 rounded-xl px-3.5 py-2 border border-slate-700/50">
        <div className="flex items-start gap-2"><span className="text-slate-500 text-xs mt-0.5">🧠</span><p className="text-[10px] text-slate-400 leading-relaxed">{deductionLabel}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] rounded-xl px-4 py-3.5 border border-white/10">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-300">Largeur cabine (Lc)</span><span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚙️ Calcul normé</span></div>
          <p className="text-2xl font-bold text-white tracking-tight">{estimatedCabinWidth}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">{deductionDetails[0]}</p>
          {penaltyApplied && <p className="text-[9px] text-amber-400/70 mt-0.5 font-mono">{[penaltyGB > 0 && `Gearbox −${penaltyGB}`, penaltyH > 0 && `Hydraulique −${penaltyH}`].filter(Boolean).join(' + ')}</p>}
        </div>
        <div className="bg-white/[0.03] rounded-xl px-4 py-3.5 border border-white/10">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-300">Profondeur cabine (Pc)</span><span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚙️ Calcul normé</span></div>
          <p className="text-2xl font-bold text-white tracking-tight">{estimatedCabinDepth}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">{deductionDetails[1]}</p>
          {penaltyApplied && <p className="text-[9px] text-amber-400/70 mt-0.5 font-mono">{[penaltyGB > 0 && `Gearbox −${penaltyGB}`, penaltyH > 0 && `Hydraulique −${penaltyH}`].filter(Boolean).join(' + ')}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">E_cp={E_CP}</span>
        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">E_guides={E_GUIDES_PATTES}</span>
        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">J_sécu={J_SECURITE}</span>
        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">E_porte_{porteType === 'Centrale' ? 'cent' : porteType === 'Battante' ? 'batt' : 'télesc'}={porteType === 'Centrale' ? E_PORTE_CENTRALE : porteType === 'Battante' ? E_PORTE_BATTANTE : E_PORTE_TELESCOPIQUE}</span>
        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">Rés.tech={E_RESERVE_TECHNIQUE}</span>
        {penaltyApplied && <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-700/40">Pén: {[penaltyGB > 0 && `GB-${penaltyGB}`, penaltyH > 0 && `HY-${penaltyH}`].filter(Boolean).join(' ')}</span>}
      </div>
    </div>}

    {/* Pit & Headroom */}
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <FormInput label="Profondeur cuvette (mm)" value={data.pitDepth} onChange={s('pitDepth')} placeholder="Ex: 1500" type="number" />
        {pW && <div className="flex items-start gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl"><span className="text-red-400 text-xs mt-0.5">⚠️</span><p className="text-[11px] text-red-300 leading-tight">Cuvette non conforme NF EN 81-20 (≥ 500 mm)</p></div>}
        {data.pitDepth !== '' && !isNaN(pN) && pN < 1400 && <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl"><span className="text-amber-400 text-xs mt-0.5">📋</span><div><p className="text-[11px] font-semibold text-amber-300">Cuvette non conforme (Standard ≥ 1400 mm)</p><p className="text-[10px] text-amber-400">Une remarque sera inscrite dans la Fiche Technique.</p></div></div>}
      </div>
      <div className="flex flex-col gap-1.5">
        <FormInput label="Hauteur dernier étage (mm)" value={data.topFloorHeight} onChange={s('topFloorHeight')} placeholder="Ex: 4200" type="number" />
        {tW && <div className="flex items-start gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl"><span className="text-red-400 text-xs mt-0.5">⚠️</span><p className="text-[11px] text-red-300 leading-tight">Hauteur sous dalle insuffisante</p></div>}
        {data.topFloorHeight !== '' && !isNaN(tN) && tN < 3800 && <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl"><span className="text-amber-400 text-xs mt-0.5">📋</span><div><p className="text-[11px] font-semibold text-amber-300">Hauteur sous dalle non conforme (Standard ≥ 3800 mm)</p><p className="text-[10px] text-amber-400">Une remarque sera inscrite dans la Fiche Technique.</p></div></div>}
      </div>
    </div>
  </div>
}

// ─── Step 4: Matériaux ────────────────────────────────────────────────────
function StepMateriaux({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Configurez la cabine selon les standards du catalogue.</p>
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold">📋</div><p className="text-sm font-semibold text-gray-200">Classification Catalogue Mekisan</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectRichWithAutre label="Type de cabine" value={data.typeCabine} onChange={s('typeCabine')} options={TYPE_CABINE_OPTIONS} customValue={data.customTypeCabine} onCustomChange={s('customTypeCabine')} placeholder="Ex: Cabine hospitaliere renforcee..." />
      <FormSelectRichWithAutre label="Type de chassis / arcade" value={data.typeChassisArcade} onChange={s('typeChassisArcade')} options={TYPE_CHASSIS_ARCADE_OPTIONS} customValue={data.customChassis} onCustomChange={s('customChassis')} placeholder="Ex: Chassis renforce sur mesure..." />
      <FormSelectRichWithAutre label="Finition portes cabine" value={data.finitionPorteCabine} onChange={s('finitionPorteCabine')} options={FINITION_PORTE_CABINE_OPTIONS} customValue={data.customFinitionPorte} onCustomChange={s('customFinitionPorte')} placeholder="Ex: Laque noir mat..." />
      <FormSelectRichWithAutre label="Finition interieur cabine" value={data.finitionInterieurCabine} onChange={s('finitionInterieurCabine')} options={FINITION_INTERIEUR_CABINE_OPTIONS} customValue={data.customFinitionInterieur} onCustomChange={s('customFinitionInterieur')} placeholder="Ex: Cuir vegetal sur mesure..." />
      <FormSelectRichWithAutre label="Revetement de sol" value={data.revetementSol} onChange={s('revetementSol')} options={REVETEMENT_SOL_OPTIONS} customValue={data.customRevetementSol} onCustomChange={s('customRevetementSol')} placeholder="Ex: Carrelage artisanal..." />
    </div>
    <hr className="border-slate-600/30" />
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-600 flex items-center justify-center text-white text-[10px] font-bold">M</div><p className="text-sm font-semibold text-gray-200">Materiaux (sur mesure)</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectWithAutre label="Materiau cabine" value={data.matCabin} onChange={s('matCabin')} options={CABIN_WALL_MATERIALS}
        customValue={data.customMatCabin} onCustomChange={s('customMatCabin')} placeholder="Ex: Acier galvanise 3 mm..." />
      <FormSelectWithAutre label="Materiau portes" value={data.matDoors} onChange={s('matDoors')} options={DOOR_MATERIALS}
        customValue={data.customMatDoors} onCustomChange={s('customMatDoors')} placeholder="Ex: Aluminium anodise..." />
      <FormSelectWithAutre label="Materiau parois" value={data.matWalls} onChange={s('matWalls')} options={CABIN_WALL_MATERIALS}
        customValue={data.customMatWalls} onCustomChange={s('customMatWalls')} placeholder="Ex: Stratifie haute pression..." />
    </div>
  </div>
}

// ─── Step 5: Options ──────────────────────────────────────────────────────
function StepOptions({ data, setData }: any) {
  const b = (f: keyof FormData) => (v: boolean) => setData({ ...data, [f]: v })
  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Options supplémentaires.</p>
    <div className="grid grid-cols-2 gap-3">
      <FormCheckbox label="Ascenseur panoramique" checked={data.optPanoramic} onChange={b('optPanoramic')} />
      <FormCheckbox label="Alimentation de secours" checked={data.optBackupPower} onChange={b('optBackupPower')} />
      <FormCheckbox label="Annonces vocales" checked={data.optVoiceAnnounce} onChange={b('optVoiceAnnounce')} />
      <FormCheckbox label="CCTV intégré" checked={data.optCctv} onChange={b('optCctv')} />
      <FormCheckbox label="Portes coupe-feu" checked={data.optFireDoors} onChange={b('optFireDoors')} />
      <FormCheckbox label="Panneau tactile" checked={data.optTouchPanel} onChange={b('optTouchPanel')} />
      <FormCheckbox label="Ventilateur de gaine" checked={data.optVentilation} onChange={b('optVentilation')} />
      <FormCheckbox label="Barreaudage de protection" checked={data.optBarreaudage} onChange={b('optBarreaudage')} />
      <FormCheckbox label="Alarme de cabine" checked={data.optAlarme} onChange={b('optAlarme')} />
    </div>
  </div>
}

// ─── Step 6: Finalisation ─────────────────────────────────────────────────
function StepFinalisation({ data, setData }: any) {
  const { estimatedCabinWidth, estimatedCabinDepth, isActive, deductionLabel } = useSalimHamounAI(data.dimWidth, data.dimDepth, data.contrepoidsPosition, data.typePorte, data.motorSubtype, data.motorType)
  const sections = [
    { title: 'Client', rows: [
      ...(data.clientName ? [{ label: 'Nom', value: data.clientName }] : [{ label: 'Nom', value: '—' }]),
      ...(data.clientEmail ? [{ label: 'Email', value: data.clientEmail }] : []),
      ...(data.clientPhone ? [{ label: 'Téléphone', value: data.clientPhone }] : []),
      ...(data.clientCity ? [{ label: 'Ville', value: data.clientCity }] : []),
    ]},
    { title: 'Motorisation', rows: [
      { label: 'Type', value: data.motorType },
      ...(data.motorSubtype ? [{ label: 'Sous-type', value: data.motorSubtype }] : []),
      ...(data.motorSpeed ? [{ label: 'Vitesse', value: `${data.motorSpeed} m/s` }] : []),
      ...(data.motorFloors ? [{ label: 'Étages', value: data.motorFloors }] : []),
    ]},
    { title: 'Dimensions', rows: [
      ...(data.dimWidth ? [{ label: 'Largeur gaine', value: `${data.dimWidth} mm` }] : []),
      ...(data.dimDepth ? [{ label: 'Profondeur gaine', value: `${data.dimDepth} mm` }] : []),
      ...(data.dimHeight ? [{ label: 'Hauteur gaine', value: `${data.dimHeight} mm` }] : []),
      ...(data.contrepoidsPosition ? [{ label: 'Position CP', value: data.contrepoidsPosition === 'Fond' ? 'Au Fond' : 'Latéral' }] : []),
      ...(isActive && deductionLabel ? [{ label: 'Algorithme', value: deductionLabel }] : []),
      ...(isActive && estimatedCabinWidth ? [{ label: 'Largeur cabine (SH AI)', value: estimatedCabinWidth }] : []),
      ...(isActive && estimatedCabinDepth ? [{ label: 'Profondeur cabine (SH AI)', value: estimatedCabinDepth }] : []),
      ...(data.pitDepth ? [{ label: 'Profondeur cuvette', value: `${data.pitDepth} mm` }] : []),
      ...(data.topFloorHeight ? [{ label: 'Hauteur dernier étage', value: `${data.topFloorHeight} mm` }] : []),
      ...(data.largeurPassageLibre ? [{ label: 'Passage libre (PL)', value: `${data.largeurPassageLibre} mm` }] : []),
      ...(data.hauteurUtileCabine ? [{ label: 'Hauteur utile', value: `${data.hauteurUtileCabine} mm` }] : []),
    ]},
    { title: 'Catalogue', rows: [
      ...(data.typeCabine ? [{ label: 'Type cabine', value: data.typeCabine }] : []),
      ...(data.typePorte ? [{ label: 'Type portes', value: data.typePorte }] : []),
      ...(data.finitionPorteCabine ? [{ label: 'Finition portes', value: data.finitionPorteCabine }] : []),
      ...(data.typeChassisArcade ? [{ label: 'Châssis', value: data.typeChassisArcade }] : []),
      ...(data.finitionInterieurCabine ? [{ label: 'Finition intérieur', value: data.finitionInterieurCabine }] : []),
      ...(data.revetementSol ? [{ label: 'Revêtement sol', value: data.revetementSol }] : []),
    ]},
    { title: 'Matériaux', rows: [
      ...(data.matCabin ? [{ label: 'Cabine', value: data.matCabin }] : []),
      ...(data.matDoors ? [{ label: 'Portes', value: data.matDoors }] : []),
      ...(data.matWalls ? [{ label: 'Parois', value: data.matWalls }] : []),
    ]},
    { title: 'Options', rows: [
      ...(data.optPanoramic ? [{ label: 'Ascenseur panoramique', value: 'Oui' }] : []),
      ...(data.optBackupPower ? [{ label: 'Alimentation secours', value: 'Oui' }] : []),
      ...(data.optVoiceAnnounce ? [{ label: 'Annonces vocales', value: 'Oui' }] : []),
      ...(data.optCctv ? [{ label: 'CCTV', value: 'Oui' }] : []),
      ...(data.optFireDoors ? [{ label: 'Portes coupe-feu', value: 'Oui' }] : []),
      ...(data.optTouchPanel ? [{ label: 'Panneau tactile', value: 'Oui' }] : []),
      ...(data.optVentilation ? [{ label: 'Ventilateur gaine', value: 'Oui' }] : []),
      ...(data.optBarreaudage ? [{ label: 'Barreaudage', value: 'Oui' }] : []),
      ...(data.optAlarme ? [{ label: 'Alarme cabine', value: 'Oui' }] : []),
    ]},
  ]
  return <div className="space-y-6">
    <div className="flex items-center gap-2 mb-1"><Icon name="FileCheck" className="w-5 h-5 text-amber-400" /><p className="text-sm font-semibold text-gray-200">Récapitulatif</p></div>
    <div className="space-y-4">{sections.map((section, si) => <div key={si}><h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{section.title}</h4><div className="border border-slate-600/50 rounded-xl divide-y divide-slate-600/30 bg-slate-700/40">{section.rows.length === 0 ? <p className="px-4 py-2.5 text-sm text-gray-400 italic">—</p> : section.rows.map((row: any, ri: number) => <div key={ri} className="flex items-center justify-between px-4 py-2.5"><span className="text-sm text-gray-400">{row.label}</span><span className="text-sm font-semibold text-gray-200">{row.value}</span></div>)}</div></div>)}</div>
    {/* ─── Notes ─── */}
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">📝 Notes complémentaires (optionnel)</label>
      <textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })}
        placeholder="Ajoutez des informations spécifiques pour cette commande (ex: accès chantier, particularités techniques, remarques installation...)"
        rows={3}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-600/50 text-sm text-gray-100 bg-slate-700/60 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none" />
    </div>
    <hr className="border-slate-600/30" />
    <div className="space-y-3">
      <div onClick={() => setData({ ...data, agreed: !data.agreed })} className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition-all cursor-pointer select-none">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${data.agreed ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`}>{data.agreed && <Icon name="Check" className="w-3.5 h-3.5 text-white" />}</div>
        <span className="text-sm font-medium text-gray-200 leading-relaxed">Je confirme que toutes les informations sont correctes.</span>
      </div>
      <p className="text-[11px] text-gray-500 text-center">Le numéro de série sera généré automatiquement.</p>
    </div>
  </div>
}

// ─── Main Component ───────────────────────────────────────────────────────
interface Props { onBack: () => void; editOrder?: any }

export default function AddElevator({ onBack, editOrder }: Props) {
  const h = hydrate()
  const initialStep = editOrder ? 5 : h.step // If editing, go to recapitulatif by default
  const [step, setStep] = useState(initialStep)
  const [data, setData] = useState<FormData>(() => {
    if (editOrder) {
      // Pre-fill form with existing order data
      return {
        serialNumber: editOrder.serialNumber || '',
        projectName: editOrder.projectName || '',
        priority: editOrder.priority || 'NORMAL',
        clientName: editOrder.clientName || '',
        clientEmail: editOrder.clientEmail || '',
        clientPhone: editOrder.clientPhone || '',
        clientPhone2: editOrder.clientPhone2 || '',
        clientCity: editOrder.clientCity || '',
        motorType: editOrder.typeMotorisation || 'ÉLECTRIQUE',
        motorSubtype: editOrder.sousTypeElectrique || '',
        motorSpeed: editOrder.vitesseMs || '',
        motorFloors: editOrder.nombreEtages || '',
        dimWidth: editOrder.largeurGaineMm || '',
        dimDepth: editOrder.profondeurGaineMm || '',
        dimHeight: editOrder.hauteurGaineMm || '',
        pitDepth: editOrder.profondeurCuvetteMm || '',
        topFloorHeight: editOrder.hauteurDernierEtageMm || '',
        contrepoidsPosition: editOrder.contrepoidsPosition || 'Fond',
        largeurPassageLibre: editOrder.largeurPassageLibreMm || '',
        hauteurUtileCabine: editOrder.hauteurUtileCabineMm || '',
        typeSuspensionGuidage: editOrder.typeSuspensionGuidage || '',
        systemeSurcharge: editOrder.systemeSurcharge || '',
        matCabin: editOrder.materiauCabine || '',
        matDoors: editOrder.materiauPortes || '',
        matWalls: editOrder.materiauParois || '',
        matSol: editOrder.materiauSol || '',
        typeCabine: editOrder.typeCabine || '',
        typePorte: editOrder.typePorte || '',
        finitionPorteCabine: editOrder.finitionPorteCabine || '',
        typeChassisArcade: editOrder.typeChassisArcade || '',
        finitionInterieurCabine: editOrder.finitionInterieurCabine || '',
        revetementSol: editOrder.revetementSol || '',
        optPanoramic: !!editOrder.optPanoramique, optBackupPower: !!editOrder.optSecours,
        optVoiceAnnounce: !!editOrder.optAnnoncesVocales, optCctv: !!editOrder.optCctv,
        optFireDoors: !!editOrder.optPortesCoupeFeu, optTouchPanel: !!editOrder.optPanneauTactile,
        optVentilation: !!editOrder.optVentilation, optBarreaudage: !!editOrder.optBarreaudage,
        optAlarme: !!editOrder.optAlarme,
        notes: editOrder.notes || '',
        agreed: true,
        customMatCabin: '', customMatDoors: '', customMatWalls: '',
        customMatSol: '', customTypeCabine: '', customTypePorte: '',
        customFinitionPorte: '', customChassis: '', customFinitionInterieur: '',
        customRevetementSol: '', customSuspension: '', customSurcharge: '',
      }
    }
    return h.data
  })
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [triedNext, setTriedNext] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'warning' | 'success' } | null>(null)

  useEffect(() => { try { localStorage.setItem(FORM_KEY, JSON.stringify(data)) } catch {}; try { localStorage.setItem(STEP_KEY, String(step)) } catch {} }, [data, step])
  const prevSaved = useRef(saved)
  useEffect(() => { if (saved && !prevSaved.current) { try { localStorage.removeItem(FORM_KEY) } catch {}; try { localStorage.removeItem(STEP_KEY) } catch {} }; prevSaved.current = saved }, [saved])

  const isLastStep = step === STEPS.length - 1; const isFirstStep = step === 0
  // All steps are now freely editable - no validation blocking
  const canProceed = () => true
  const isFinalValid = () => true

  const handleSubmitOrder = async () => {
    setSubmitting(true)
    setSubmitError(null)
    // Send the serial as-is: if empty/whitespace, the server generates ASC-XXX-MM-YY
    const serial = data.serialNumber.trim() || undefined
    // Resolve "Autre" selections to their custom text values
    const or = (val: string, custom: string) => val === 'AUTRE' ? (custom || 'Non specifie') : val
    const payload = {
      clientName: data.clientName, clientEmail: data.clientEmail?.includes('@') ? data.clientEmail : undefined,
      clientPhone: data.clientPhone, clientPhone2: data.clientPhone2 || undefined, clientCity: data.clientCity, serialNumber: serial,
      projectName: data.projectName || undefined, notes: data.notes || undefined, priority: data.priority || 'NORMAL',
      typeMotorisation: data.motorType, sousTypeElectrique: data.motorSubtype || undefined,
      vitesseMs: data.motorSpeed || undefined, nombreEtages: data.motorFloors || undefined,
      largeurGaineMm: data.dimWidth, profondeurGaineMm: data.dimDepth, hauteurGaineMm: data.dimHeight,
      profondeurCuvetteMm: data.pitDepth || undefined, hauteurDernierEtageMm: data.topFloorHeight || undefined,
      contrepoidsPosition: data.contrepoidsPosition, positionContrepoids: data.contrepoidsPosition === 'Fond' ? 'ARRIERE' : 'LATERAL',
      largeurCabineCalculeeMm: data.dimWidth ? String(computeSalimLc(parseFloat(data.dimWidth), data.contrepoidsPosition, data.motorSubtype, data.motorType)) : undefined,
      profondeurCabineCalculeeMm: data.dimDepth ? String(computeSalimPc(parseFloat(data.dimDepth), data.contrepoidsPosition, data.typePorte, data.motorSubtype, data.motorType)) : undefined,
      materiauCabine: or(data.matCabin, data.customMatCabin) || undefined,
      materiauPortes: or(data.matDoors, data.customMatDoors) || undefined,
      materiauParois: or(data.matWalls, data.customMatWalls) || undefined,
      materiauSol: or(data.matSol, data.customMatSol) || undefined,
      typeCabine: or(data.typeCabine, data.customTypeCabine) || undefined,
      typePorte: or(data.typePorte, data.customTypePorte) || undefined,
      finitionPorteCabine: or(data.finitionPorteCabine, data.customFinitionPorte) || undefined,
      typeChassisArcade: or(data.typeChassisArcade, data.customChassis) || undefined,
      finitionInterieurCabine: or(data.finitionInterieurCabine, data.customFinitionInterieur) || undefined,
      revetementSol: or(data.revetementSol, data.customRevetementSol) || undefined,
      largeurPassageLibreMm: data.largeurPassageLibre || undefined, hauteurUtileCabineMm: data.hauteurUtileCabine || undefined,
      typeSuspensionGuidage: or(data.typeSuspensionGuidage, data.customSuspension) || undefined,
      systemeSurcharge: or(data.systemeSurcharge, data.customSurcharge) || undefined,
      optPanoramique: data.optPanoramic, optSecours: data.optBackupPower, optAnnoncesVocales: data.optVoiceAnnounce,
      optCctv: data.optCctv, optPortesCoupeFeu: data.optFireDoors, optPanneauTactile: data.optTouchPanel,
      optVentilation: data.optVentilation, optBarreaudage: data.optBarreaudage, optAlarme: data.optAlarme,
    }
    // ── Debug: log full payload before submission ──────────────────────────
    console.log('[CONFIGURATOR] 🚀 Submitting payload:', JSON.stringify(payload, null, 2))
    if (!payload.projectName) console.warn('[CONFIGURATOR] ⚠️  projectName is empty — will be saved as null')

    // ── Essential field validation ─────────────────────────────────────────
    const essentialFields: { key: string; label: string }[] = [
      { key: 'clientName', label: 'Nom du client' },
      { key: 'clientPhone', label: 'Téléphone' },
      { key: 'clientCity', label: 'Ville' },
      { key: 'largeurGaineMm', label: 'Largeur gaine' },
      { key: 'profondeurGaineMm', label: 'Profondeur gaine' },
      { key: 'hauteurGaineMm', label: 'Hauteur gaine' },
    ]
    const missing = essentialFields.filter(f => !(payload as any)[f.key])
    if (missing.length > 0) {
      const missingLabels = missing.map(f => f.label).join(', ')
      setSubmitError(`❌ Champs obligatoires manquants : ${missingLabels}. Veuillez revenir aux étapes précédentes pour les remplir.`)
      setSubmitting(false)
      return
    }

    try {
      if (editOrder) {
        // Update existing order
        await apiFetch(`/orders/${editOrder.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        // Create new order
        await apiFetch('/orders/create-and-sync', { method: 'POST', body: JSON.stringify(payload) })
      }
      setSaved(true)
    } catch (err: any) {
      await new Promise(r => setTimeout(r, 50))
      setSubmitError(err.message || '❌ Erreur lors de l\'enregistrement.')
    } finally { setSubmitting(false) }
  }

  const handleNext = () => { setTriedNext(true)
    if (isLastStep) { if (isFinalValid()) handleSubmitOrder(); return }
    if (!canProceed()) return; setTriedNext(false); setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  const handlePrev = () => { setTriedNext(false); setStep(s => Math.max(s - 1, 0)) }

  const renderStep = () => {
    switch (STEPS[step].key) {
      case 'client': return <StepClient data={data} setData={setData} />
      case 'motorisation': return <StepMotorisation data={data} setData={setData} />
      case 'dimensions': return <StepDimensions data={data} setData={setData} />
      case 'materiaux': return <StepMateriaux data={data} setData={setData} />
      case 'options': return <StepOptions data={data} setData={setData} />
      case 'finalisation': return <StepFinalisation data={data} setData={setData} />
    }
  }

  if (submitting) return <div className="flex-1 flex flex-col items-center justify-center p-12">
    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-amber-400 animate-spin mb-6" />
    <h2 className="text-xl font-bold text-gray-200 mb-3">Traitement en cours</h2>
    <p className="text-xs text-gray-500">Enregistrement de la commande...</p>
  </div>

  if (submitError) return <div className="flex-1 flex flex-col items-center justify-center p-12">
    <h2 className="text-xl font-bold text-gray-200 mb-2">❌ Erreur</h2>
    <p className="text-sm text-red-400 mb-6">{submitError}</p>
    <div className="flex gap-3">
      <button onClick={() => { setSubmitError(null); setSubmitting(false) }} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold">🔄 Réessayer</button>
      <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold">← Retour</button>
    </div>
  </div>

  if (saved) return <div className="flex-1 flex flex-col items-center justify-center p-12">
    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6"><Icon name="Check" className="w-10 h-10 text-amber-400" /></div>
    <h2 className="text-2xl font-bold text-gray-200 mb-2">Commande enregistrée ✅</h2>
    <p className="text-sm text-gray-500 mb-8">La commande a été transmise au bureau d'étude.</p>
    <button onClick={onBack} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25"><span>←</span> Retour</button>
  </div>

  return <div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.03] backdrop-blur-sm">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-all"><span>←</span> Retour</button>
      <div className="flex items-center gap-2"><span className="text-xs text-gray-500 font-medium">Étape {step + 1} / {STEPS.length}</span>
        <div className="w-24 h-1.5 rounded-full bg-white/[0.08] overflow-hidden"><div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
    </div>
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-56 bg-white/[0.03] border-r border-white/5 flex-shrink-0 p-4 overflow-y-auto">
        <div className="space-y-1">{STEPS.map((s, i) => { const isA = i === step; const isC = i < step; return <button key={s.key} onClick={() => setStep(i)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isA ? 'bg-amber-500/15 text-amber-400 font-bold' : isC ? 'text-amber-400' : 'text-gray-500'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isA ? 'bg-amber-400 text-slate-900' : isC ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.06] text-gray-500'}`}>{isC ? <Icon name="Check" className="w-3.5 h-3.5" /> : i + 1}</div><span>{s.label}</span></button> })}</div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-2"><h2 className="text-xl font-bold text-gray-200">{STEPS[step].label}</h2></div>
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-700/50">{renderStep()}
            {triedNext && STEPS[step].key === 'client' && !canProceed() && <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3"><span>⚠️</span><span>Champs obligatoires requis.</span></div>}
          </div>
          <div className="flex items-center justify-between mt-6">
            <button onClick={handlePrev} disabled={isFirstStep} className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${isFirstStep ? 'text-gray-400 cursor-not-allowed' : 'border border-white/10 text-gray-300 hover:bg-white/[0.06]'}`}><span>←</span> Précédent</button>
            <button onClick={handleNext} disabled={(isLastStep && !isFinalValid()) || submitting} className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg ${isLastStep ? (isFinalValid() && !submitting ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/25' : 'bg-white/[0.06] text-gray-500 cursor-not-allowed') : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'}`}>
              {isLastStep ? <><Icon name="Check" className="w-4 h-4" /> Confirmer</> : <>Suivant <span>→</span></>}
            </button>
          </div>
        </div>
      </main>
    </div>
    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-xl shadow-lg border bg-amber-500/10 border-amber-500/30 text-amber-400 text-sm">{toast.message}</div>}
  </div>
}
