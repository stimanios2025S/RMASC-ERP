import { useState, useMemo, useEffect, useRef } from 'react'
import { apiFetch } from '../config/api'

// ─── Production Serial Generator ───────────────────────────────────────────
function generateSerial(): string {
  const year = new Date().getFullYear()
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RMASC-${year}-${ts}${rand}`
}

// ─── Types ─────────────────────────────────────────────────────────────────
type StepKey = 'client' | 'motorisation' | 'dimensions' | 'materiaux' | 'options' | 'finalisation'

interface FormData {
  serialNumber: string; projectName: string; priority: string
  clientName: string; clientEmail: string; clientPhone: string; clientCity: string
  motorType: string; motorSubtype: string; motorSpeed: string; motorFloors: string
  dimWidth: string; dimDepth: string; dimHeight: string
  pitDepth: string; topFloorHeight: string; contrepoidsPosition: string
  largeurPassageLibre: string; hauteurUtileCabine: string
  typeSuspensionGuidage: string; systemeSurcharge: string
  matCabin: string; matDoors: string; matWalls: string
  typeCabine: string; typePorte: string; finitionPorteCabine: string
  typeChassisArcade: string; finitionInterieurCabine: string; revetementSol: string
  optPanoramic: boolean; optBackupPower: boolean; optVoiceAnnounce: boolean
  optCctv: boolean; optFireDoors: boolean; optTouchPanel: boolean
  optVentilation: boolean; optBarreaudage: boolean; optAlarme: boolean
  agreed: boolean
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
  clientName: '', clientEmail: '', clientPhone: '', clientCity: '',
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
  agreed: false,
}

// ─── Catalog Options ──────────────────────────────────────────────────────
const CABIN_WALL_MATERIALS = [
  'Acier Inoxydable Brossé', 'Acier Inoxydable Miroir', 'Verre Trempé (Stratifié 12mm)',
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
    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}{optional && <span className="text-gray-400 text-[11px] font-normal italic">(Optionnel)</span>}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-10 px-3.5 rounded-xl border bg-surface-50 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-300 transition-all border-gray-200"/>
  </div>
}
function FormSelect({ label, value, onChange, options, required = false }: any) {
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-surface-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-300 transition-all appearance-none">
      <option value="" disabled>Sélectionner...</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
}
function FormSelectRich({ label, value, onChange, options, required = false }: any) {
  const s = options.find((o: any) => o.value === value)
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-surface-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-300 transition-all appearance-none">
      <option value="" disabled>Sélectionner...</option>
      {options.map((o: any) => <option key={o.value} value={o.value} title={o.desc}>{o.label}</option>)}
    </select>
    {s && <p className="text-[11px] text-gray-400 italic mt-0.5 leading-tight">{s.desc}</p>}
  </div>
}
function FormSelectNum({ label, value, onChange, options, suffix = '', required = false }: any) {
  return <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">{label}{required && <span className="text-red-400 text-xs">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-surface-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-300 transition-all appearance-none">
      <option value="" disabled>Sélectionner...</option>
      {options.map((o: string) => <option key={o} value={o}>{o}{suffix ? ` ${suffix}` : ''}</option>)}
    </select>
  </div>
}
function FormCheckbox({ label, checked, onChange }: any) {
  return <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-surface-50 hover:bg-surface-100 transition-all cursor-pointer group">
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-accent-500 border-accent-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
      {checked && <Icon name="Check" className="w-3.5 h-3.5 text-white" />}
    </div>
    <span className="text-sm font-medium text-gray-700 select-none">{label}</span>
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
      <FormInput label="Ville" value={data.clientCity} onChange={s('clientCity')} placeholder="Ex: Bouira" required />
    </div>
    <div className="border-t border-gray-100 pt-3 mt-2">
      <div className="col-span-2"><FormInput label="Nom du projet" value={data.projectName} onChange={s('projectName')} placeholder="Ex: Résidence El Manar Bâtiment B" optional /></div>
    </div>
    <div className="border-t border-gray-200 pt-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">⚙️ Configuration & Priorité</p>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="N° de série *" value={data.serialNumber} onChange={s('serialNumber')} placeholder="Ex: RMASC-2026-XXXXXX" required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">Priorité <span className="text-red-400 text-xs">*</span></label>
          <div className="flex gap-2 h-10">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p.value} type="button" onClick={() => setData({ ...data, priority: p.value })}
                className={`flex-1 rounded-xl text-xs font-bold border-2 transition-all ${data.priority === p.value ? `${p.color} border-current` : 'border-gray-200 text-gray-400 bg-surface-50 hover:border-gray-300'}`}>
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
  </div>
}

// ─── Step 3: Dimensions ───────────────────────────────────────────────────
function StepDimensions({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  const { estimatedCabinWidth, estimatedCabinDepth, isActive, deductionLabel, deductionDetails, positionCp, porteType, moteurType, penaltyApplied, penaltyValue, isHydraulic, penaltyGB, penaltyH } = useSalimHamounAI(data.dimWidth, data.dimDepth, data.contrepoidsPosition, data.typePorte, data.motorSubtype, data.motorType)
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

    {/* Spécifications Structurelles */}
    <div className="bg-gradient-to-r from-primary-50/60 to-surface-50 border border-primary-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">⚙</div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Spécifications Structurelles</span>
        <span className="text-[9px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">SH AI</span>
      </div>
      <div className={`grid gap-3 ${isE ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {isE && <FormSelectRich label="Type de moteur" value={data.motorSubtype} onChange={s('motorSubtype')} options={MOTEUR_SUBTYPE_OPTIONS} />}
        <FormSelectRich label="Position contrepoids" value={data.contrepoidsPosition} onChange={s('contrepoidsPosition')} options={CONTREPOIDS_POSITION_OPTIONS} />
        <FormSelectRich label="Type de porte palière" value={data.typePorte} onChange={s('typePorte')} options={TYPE_PORTE_INSTALLATION_OPTIONS} />
      </div>
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
        <div className="bg-surface-50/5 rounded-xl px-4 py-3.5 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-300">Largeur cabine (Lc)</span><span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚙️ Calcul normé</span></div>
          <p className="text-2xl font-bold text-white tracking-tight">{estimatedCabinWidth}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">{deductionDetails[0]}</p>
          {penaltyApplied && <p className="text-[9px] text-amber-400/70 mt-0.5 font-mono">{[penaltyGB > 0 && `Gearbox −${penaltyGB}`, penaltyH > 0 && `Hydraulique −${penaltyH}`].filter(Boolean).join(' + ')}</p>}
        </div>
        <div className="bg-surface-50/5 rounded-xl px-4 py-3.5 border border-slate-700/60">
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
        {pW && <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl"><span className="text-red-500 text-xs mt-0.5">⚠️</span><p className="text-[11px] text-red-700 leading-tight">Cuvette non conforme NF EN 81-20 (≥ 500 mm)</p></div>}
        {data.pitDepth !== '' && !isNaN(pN) && pN < 1400 && <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl"><span className="text-amber-500 text-xs mt-0.5">📋</span><div><p className="text-[11px] font-semibold text-amber-800">Cuvette non conforme (Standard ≥ 1400 mm)</p><p className="text-[10px] text-amber-700">Une remarque sera inscrite dans la Fiche Technique.</p></div></div>}
      </div>
      <div className="flex flex-col gap-1.5">
        <FormInput label="Hauteur dernier étage (mm)" value={data.topFloorHeight} onChange={s('topFloorHeight')} placeholder="Ex: 4200" type="number" />
        {tW && <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl"><span className="text-red-500 text-xs mt-0.5">⚠️</span><p className="text-[11px] text-red-700 leading-tight">Hauteur sous dalle insuffisante</p></div>}
        {data.topFloorHeight !== '' && !isNaN(tN) && tN < 3800 && <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl"><span className="text-amber-500 text-xs mt-0.5">📋</span><div><p className="text-[11px] font-semibold text-amber-800">Hauteur sous dalle non conforme (Standard ≥ 3800 mm)</p><p className="text-[10px] text-amber-700">Une remarque sera inscrite dans la Fiche Technique.</p></div></div>}
      </div>
    </div>

    <hr className="border-gray-100" />
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">⚙</div><p className="text-sm font-semibold text-gray-700">Spécifications Mécaniques</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectNum label="Largeur passage libre (PL)" value={data.largeurPassageLibre} onChange={s('largeurPassageLibre')} options={PASSAGE_LIBRE_OPTIONS} suffix="mm" />
      <FormSelectNum label="Hauteur utile cabine" value={data.hauteurUtileCabine} onChange={s('hauteurUtileCabine')} options={HAUTEUR_UTILE_OPTIONS} suffix="mm" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectRich label="Type suspension / guidage" value={data.typeSuspensionGuidage} onChange={s('typeSuspensionGuidage')} options={TYPE_SUSPENSION_OPTIONS} />
      <FormSelectRich label="Système de surcharge" value={data.systemeSurcharge} onChange={s('systemeSurcharge')} options={SYSTEME_SURCHARGE_OPTIONS} />
    </div>
  </div>
}

// ─── Step 4: Matériaux ────────────────────────────────────────────────────
function StepMateriaux({ data, setData }: any) {
  const s = (f: keyof FormData) => (v: string) => setData({ ...data, [f]: v })
  return <div className="space-y-5">
    <p className="text-sm text-gray-400 mb-1">Configurez la cabine selon les standards du catalogue.</p>
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold">📋</div><p className="text-sm font-semibold text-gray-700">Classification Catalogue Mekisan</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelectRich label="Type de cabine" value={data.typeCabine} onChange={s('typeCabine')} options={TYPE_CABINE_OPTIONS} />
      <FormSelectRich label="Type de châssis / arcade" value={data.typeChassisArcade} onChange={s('typeChassisArcade')} options={TYPE_CHASSIS_ARCADE_OPTIONS} />
      <FormSelectRich label="Finition portes cabine" value={data.finitionPorteCabine} onChange={s('finitionPorteCabine')} options={FINITION_PORTE_CABINE_OPTIONS} />
      <FormSelectRich label="Finition intérieur cabine" value={data.finitionInterieurCabine} onChange={s('finitionInterieurCabine')} options={FINITION_INTERIEUR_CABINE_OPTIONS} />
      <FormSelectRich label="Revêtement de sol" value={data.revetementSol} onChange={s('revetementSol')} options={REVETEMENT_SOL_OPTIONS} />
    </div>
    <hr className="border-gray-100" />
    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">🧱</div><p className="text-sm font-semibold text-gray-700">Matériaux (sur mesure)</p></div>
    <div className="grid grid-cols-2 gap-4">
      <FormSelect label="Matériau cabine" value={data.matCabin} onChange={s('matCabin')} options={CABIN_WALL_MATERIALS} />
      <FormSelect label="Matériau portes" value={data.matDoors} onChange={s('matDoors')} options={DOOR_MATERIALS} />
      <FormSelect label="Matériau parois" value={data.matWalls} onChange={s('matWalls')} options={CABIN_WALL_MATERIALS} />
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
    <div className="flex items-center gap-2 mb-1"><Icon name="FileCheck" className="w-5 h-5 text-accent-500" /><p className="text-sm font-semibold text-gray-700">Récapitulatif</p></div>
    <div className="space-y-4">{sections.map((section, si) => <div key={si}><h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{section.title}</h4><div className="border border-gray-200 rounded-xl divide-y divide-gray-100">{section.rows.length === 0 ? <p className="px-4 py-2.5 text-sm text-gray-400 italic">—</p> : section.rows.map((row: any, ri: number) => <div key={ri} className="flex items-center justify-between px-4 py-2.5"><span className="text-sm text-gray-500">{row.label}</span><span className="text-sm font-semibold text-gray-800">{row.value}</span></div>)}</div></div>)}</div>
    <hr className="border-gray-100" />
    <div className="space-y-3">
      <div onClick={() => setData({ ...data, agreed: !data.agreed })} className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 bg-surface-50 hover:bg-surface-100 transition-all cursor-pointer select-none">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${data.agreed ? 'bg-accent-500 border-accent-500' : 'border-gray-300'}`}>{data.agreed && <Icon name="Check" className="w-3.5 h-3.5 text-white" />}</div>
        <span className="text-sm font-medium text-gray-700 leading-relaxed">Je confirme que toutes les informations sont correctes.</span>
      </div>
      <p className="text-[11px] text-gray-400 text-center">Le numéro de série sera généré automatiquement.</p>
    </div>
  </div>
}

// ─── Main Component ───────────────────────────────────────────────────────
interface Props { onBack: () => void }

export default function AddElevator({ onBack }: Props) {
  const h = hydrate()
  const [step, setStep] = useState(h.step)
  const [data, setData] = useState<FormData>(h.data)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [triedNext, setTriedNext] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'warning' | 'success' } | null>(null)

  useEffect(() => { try { localStorage.setItem(FORM_KEY, JSON.stringify(data)) } catch {}; try { localStorage.setItem(STEP_KEY, String(step)) } catch {} }, [data, step])
  const prevSaved = useRef(saved)
  useEffect(() => { if (saved && !prevSaved.current) { try { localStorage.removeItem(FORM_KEY) } catch {}; try { localStorage.removeItem(STEP_KEY) } catch {} }; prevSaved.current = saved }, [saved])

  const isLastStep = step === STEPS.length - 1; const isFirstStep = step === 0
  const canProceed = () => { if (STEPS[step].key === 'client') return areClientFieldsFilled(data); return true }
  const isFinalValid = () => areClientFieldsFilled(data) && data.agreed

  const handleSubmitOrder = async () => {
    setSubmitting(true)
    setSubmitError(null)
    const serial = data.serialNumber.trim() || `RMASC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const payload = {
      clientName: data.clientName, clientEmail: data.clientEmail?.includes('@') ? data.clientEmail : undefined,
      clientPhone: data.clientPhone, clientCity: data.clientCity, serialNumber: serial,
      projectName: data.projectName || undefined, priority: data.priority || 'NORMAL',
      typeMotorisation: data.motorType, sousTypeElectrique: data.motorSubtype || undefined,
      vitesseMs: data.motorSpeed || undefined, nombreEtages: data.motorFloors || undefined,
      largeurGaineMm: data.dimWidth, profondeurGaineMm: data.dimDepth, hauteurGaineMm: data.dimHeight,
      profondeurCuvetteMm: data.pitDepth || undefined, hauteurDernierEtageMm: data.topFloorHeight || undefined,
      contrepoidsPosition: data.contrepoidsPosition, positionContrepoids: data.contrepoidsPosition === 'Fond' ? 'ARRIERE' : 'LATERAL',
      largeurCabineCalculeeMm: data.dimWidth ? String(computeSalimLc(parseFloat(data.dimWidth), data.contrepoidsPosition, data.motorSubtype, data.motorType)) : undefined,
      profondeurCabineCalculeeMm: data.dimDepth ? String(computeSalimPc(parseFloat(data.dimDepth), data.contrepoidsPosition, data.typePorte, data.motorSubtype, data.motorType)) : undefined,
      materiauCabine: data.matCabin || undefined, materiauPortes: data.matDoors || undefined, materiauParois: data.matWalls || undefined,
      typeCabine: data.typeCabine || undefined, typePorte: data.typePorte || undefined,
      finitionPorteCabine: data.finitionPorteCabine || undefined, typeChassisArcade: data.typeChassisArcade || undefined,
      finitionInterieurCabine: data.finitionInterieurCabine || undefined, revetementSol: data.revetementSol || undefined,
      largeurPassageLibreMm: data.largeurPassageLibre || undefined, hauteurUtileCabineMm: data.hauteurUtileCabine || undefined,
      typeSuspensionGuidage: data.typeSuspensionGuidage || undefined, systemeSurcharge: data.systemeSurcharge || undefined,
      optPanoramique: data.optPanoramic, optSecours: data.optBackupPower, optAnnoncesVocales: data.optVoiceAnnounce,
      optCctv: data.optCctv, optPortesCoupeFeu: data.optFireDoors, optPanneauTactile: data.optTouchPanel,
      optVentilation: data.optVentilation, optBarreaudage: data.optBarreaudage, optAlarme: data.optAlarme,
    }
    try {
      await apiFetch('/orders/create-and-sync', { method: 'POST', body: JSON.stringify(payload) })
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

  if (submitting) return <div className="flex-1 flex flex-col items-center justify-center p-12 bg-surface-50">
    <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-accent-500 animate-spin mb-6" />
    <h2 className="text-xl font-bold text-gray-900 mb-3">Traitement en cours</h2>
    <p className="text-xs text-gray-400">Enregistrement de la commande...</p>
  </div>

  if (submitError) return <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-b from-primary-50 to-surface-50">
    <h2 className="text-xl font-bold text-gray-900 mb-2">❌ Erreur</h2>
    <p className="text-sm text-red-600 mb-6">{submitError}</p>
    <div className="flex gap-3">
      <button onClick={() => { setSubmitError(null); setSubmitting(false) }} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold">🔄 Réessayer</button>
      <button onClick={onBack} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold">← Retour</button>
    </div>
  </div>

  if (saved) return <div className="flex-1 flex flex-col items-center justify-center p-12 bg-surface-50">
    <div className="w-20 h-20 rounded-full bg-accent-100 flex items-center justify-center mb-6"><Icon name="Check" className="w-10 h-10 text-accent-500" /></div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Commande enregistrée ✅</h2>
    <p className="text-sm text-gray-400 mb-8">La commande a été transmise au bureau d'étude.</p>
    <button onClick={onBack} className="btn-primary !px-8"><Icon name="ArrowLeft" className="w-4 h-4" /> Retour</button>
  </div>

  return <div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-surface-50">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"><Icon name="ArrowLeft" className="w-4 h-4" /> Retour</button>
      <div className="flex items-center gap-2"><span className="text-xs text-gray-400 font-medium">Étape {step + 1} / {STEPS.length}</span>
        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-accent-500 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
    </div>
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-56 bg-surface-50 border-r border-gray-100 flex-shrink-0 p-4 overflow-y-auto">
        <div className="space-y-1">{STEPS.map((s, i) => { const isA = i === step; const isC = i < step; return <button key={s.key} onClick={() => setStep(i)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isA ? 'bg-accent-50 text-accent-600 font-bold' : isC ? 'text-primary-600' : 'text-gray-400'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isA ? 'bg-accent-500 text-white' : isC ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>{isC ? <Icon name="Check" className="w-3.5 h-3.5" /> : i + 1}</div><span>{s.label}</span></button> })}</div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-2"><h2 className="text-xl font-bold text-gray-900">{STEPS[step].label}</h2></div>
          <div className="bg-surface-50 rounded-2xl p-6 shadow-card border border-gray-50">{renderStep()}
            {triedNext && STEPS[step].key === 'client' && !canProceed() && <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3"><Icon name="AlertCircle" className="w-4 h-4" /><span>Champs obligatoires requis.</span></div>}
          </div>
          <div className="flex items-center justify-between mt-6">
            <button onClick={handlePrev} disabled={isFirstStep} className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${isFirstStep ? 'text-gray-300 cursor-not-allowed' : 'border-2 border-primary-600 text-primary-600'}`}><Icon name="ArrowLeft" className="w-4 h-4" /> Précédent</button>
            <button onClick={handleNext} disabled={(isLastStep && !isFinalValid()) || submitting} className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${isLastStep ? (isFinalValid() && !submitting ? 'bg-accent-500 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-primary-700 text-white'}`}>
              {isLastStep ? <><Icon name="Check" className="w-4 h-4" /> Confirmer</> : <>Suivant <Icon name="ArrowRight" className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </main>
    </div>
    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-xl shadow-lg border bg-amber-50 border-amber-200 text-amber-800 text-sm">{toast.message}</div>}
  </div>
}
