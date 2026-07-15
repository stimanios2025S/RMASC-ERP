// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Catalog Service
//  Loads administrable catalog (materials, types, options) from the backend.
//  Falls back to built-in defaults if the API is unavailable.
// ═══════════════════════════════════════════════════════════════════════════

import { apiFetch } from './api'

export interface CatalogItem {
  value: string
  label: string
  desc?: string
  active?: boolean
  order?: number
}

export interface CatalogCategory {
  _id?: string
  category: string
  label: string
  items: CatalogItem[]
  updatedAt?: string
}

// ─── In-memory cache ────────────────────────────────────────────────────
let catalogCache: CatalogCategory[] | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

// ─── Built-in defaults (fallback) ───────────────────────────────────────
const DEFAULT_CATALOG: CatalogCategory[] = [
  {
    category: 'materiau-cabine',
    label: 'Matériaux cabine',
    items: [
      { value: 'Acier Inoxydable Brossé', label: 'Acier Inoxydable Brossé', desc: 'Finition brossée standard', order: 1 },
      { value: 'Acier Inoxydable Miroir', label: 'Acier Inoxydable Miroir', desc: 'Finition miroir luxueuse', order: 2 },
      { value: 'Inox Inoxydable', label: 'Inox Inoxydable', desc: 'Inox standard', order: 3 },
      { value: 'Inox Inoxydable + Galvanisé', label: 'Inox + Galvanisé', desc: 'Combinaison inox et galvanisé', order: 4 },
      { value: 'Verre Trempé (Stratifié 12mm)', label: 'Verre Trempé 12mm', desc: 'Verre de sécurité stratifié', order: 5 },
      { value: 'Aluminium', label: 'Aluminium', desc: 'Aluminium léger', order: 6 },
      { value: 'Méthacrylate', label: 'Méthacrylate', desc: 'Matériau acrylique', order: 7 },
      { value: 'Bois Décoratif Ignifuge', label: 'Bois Décoratif Ignifuge', desc: 'Bois ignifugé', order: 8 },
      { value: 'Mélaminé / Laminé Haute Pression', label: 'Mélaminé HPL', desc: 'Laminé haute pression', order: 9 },
    ],
  },
  {
    category: 'materiau-portes',
    label: 'Matériaux portes',
    items: [
      { value: 'Acier Inoxydable Brossé', label: 'Inox Brossé', desc: 'Finition brossée', order: 1 },
      { value: 'Acier Inoxydable Miroir', label: 'Inox Miroir', desc: 'Finition miroir', order: 2 },
      { value: 'Verre Trempé', label: 'Verre Trempé', desc: 'Porte vitrée', order: 3 },
    ],
  },
  {
    category: 'type-cabine',
    label: 'Type de cabine',
    items: [
      { value: 'PASSAGER', label: '🚶 Standard Passager', desc: 'Cabine passager standard', order: 1 },
      { value: 'PANORAMIQUE', label: '🪟 Panoramique', desc: 'Cabine panoramique', order: 2 },
      { value: 'CHARGES_LOURDES', label: '🏋️ Monte-Charge', desc: 'Cabine renforcée', order: 3 },
      { value: 'SERVICE_LIFT', label: '📦 Monte-Plat', desc: 'Cabine de service', order: 4 },
    ],
  },
  {
    category: 'type-porte',
    label: 'Type de porte',
    items: [
      { value: 'AUTOMATIQUE_CENTRALE', label: '🚪 Automatique Centrale (2V)', desc: 'Ouverture centrale 2 vantaux', order: 1 },
      { value: 'AUTOMATIQUE_TELESCOPIQUE', label: '🚪🔀 Télescopique', desc: 'Ouverture télescopique', order: 2 },
      { value: 'BATTANTE_MANUELLE', label: '🚪✋ Battante Manuelle', desc: 'Porte battante pour service', order: 3 },
    ],
  },
  {
    category: 'finition-porte-cabine',
    label: 'Finition portes cabine',
    items: [
      { value: 'INOX_BROSSE', label: 'Inox Brossé', desc: 'Aspect mat et élégant', order: 1 },
      { value: 'INOX_MIROIR', label: 'Inox Miroir', desc: 'Aspect brillant et luxueux', order: 2 },
      { value: 'INOX_TEXTURE', label: 'Inox Texturé', desc: 'Texture antidérapante', order: 3 },
      { value: 'VITREE_PANORAMIQUE', label: 'Vitrée Panoramique', desc: 'Porte entièrement vitrée', order: 4 },
    ],
  },
  {
    category: 'type-chassis',
    label: 'Type de châssis / arcade',
    items: [
      { value: 'TRACTION_ELECTRIQUE_2_1', label: '⚡ Traction Électrique 2:1', desc: 'Avantage mécanique 2:1', order: 1 },
      { value: 'TRACTION_ELECTRIQUE_1_1', label: '⚡ Traction Électrique 1:1', desc: 'Architecture directe 1:1', order: 2 },
      { value: 'HYDRAULIQUE_DIRECT', label: '💧 Hydraulique Direct', desc: 'Vérin hydraulique direct', order: 3 },
      { value: 'HYDRAULIQUE_INDIRECT_RUCKSACK', label: '💧 Hydraulique Indirect (Rucksack)', desc: 'Vérin latéral Rucksack', order: 4 },
    ],
  },
  {
    category: 'finition-interieur',
    label: 'Finition intérieur cabine',
    items: [
      { value: 'INOX MIROIR', label: 'INOX MIROIR', desc: 'Finition inox miroir', order: 1 },
      { value: 'INOX BROSSE', label: 'INOX BROSSÉ', desc: 'Finition inox brossé', order: 2 },
      { value: 'STRATIFIE BOIS', label: 'STRATIFIÉ BOIS', desc: 'Stratifié aspect bois', order: 3 },
      { value: 'VERRE LAQUE', label: 'VERRE LAQUÉ', desc: 'Verre laqué haute résistance', order: 4 },
      { value: 'CUIR VEGETAL', label: 'CUIR VÉGÉTAL', desc: 'Cuir végétal sur panneaux', order: 5 },
    ],
  },
  {
    category: 'revetement-sol',
    label: 'Revêtement de sol',
    items: [
      { value: 'CAOUTCHOUC ANTI-DERAPANT', label: 'Caoutchouc Anti-Dérapant', desc: 'Sol caoutchouc sécurité', order: 1 },
      { value: 'PVC ANTI-DERAPANT', label: 'PVC Anti-Dérapant', desc: 'Sol PVC antidérapant', order: 2 },
      { value: 'CARRELAGE GRES CERAME', label: 'Carrelage Grès Cérame', desc: 'Carrelage haute résistance', order: 3 },
      { value: 'INOX ANTI-DERAPANT', label: 'Inox Anti-Dérapant', desc: 'Sol inox antidérapant', order: 4 },
      { value: 'MARBRE RECONSTITUE', label: 'Marbre Reconstitué', desc: 'Marbre aspect luxe', order: 5 },
    ],
  },
  {
    category: 'options',
    label: 'Options disponibles',
    items: [
      { value: 'optPanoramique', label: 'Ascenseur panoramique', desc: 'Cabine avec parois vitrées', order: 1 },
      { value: 'optSecours', label: 'Alimentation de secours', desc: 'Batterie de secours', order: 2 },
      { value: 'optAnnoncesVocales', label: 'Annonces vocales', desc: 'Synthèse vocale', order: 3 },
      { value: 'optCctv', label: 'CCTV intégré', desc: 'Caméra de surveillance', order: 4 },
      { value: 'optPortesCoupeFeu', label: 'Portes coupe-feu', desc: 'Portes résistant au feu', order: 5 },
      { value: 'optPanneauTactile', label: 'Panneau tactile', desc: 'Écran tactile', order: 6 },
      { value: 'optVentilation', label: 'Ventilateur de gaine', desc: 'Ventilation forcée', order: 7 },
      { value: 'optBarreaudage', label: 'Barreaudage de protection', desc: 'Barreaudage de sécurité', order: 8 },
      { value: 'optAlarme', label: 'Alarme de cabine', desc: 'Alarme sonore', order: 9 },
    ],
  },
  {
    category: 'motorisation',
    label: 'Types de motorisation',
    items: [
      { value: 'ÉLECTRIQUE', label: 'ÉLECTRIQUE', desc: 'Motorisation électrique classique', order: 1 },
      { value: 'HYDRAULIQUE', label: 'HYDRAULIQUE', desc: 'Motorisation hydraulique', order: 2 },
    ],
  },
]

// ─── Get catalog from API or fallback ───────────────────────────────────
export async function getCatalog(): Promise<CatalogCategory[]> {
  if (catalogCache && Date.now() - cacheTime < CACHE_TTL) return catalogCache

  try {
    const data: CatalogCategory[] = await apiFetch('/catalog')
    if (data && data.length > 0) {
      catalogCache = data
      cacheTime = Date.now()
      return data
    }
  } catch {
    // API unavailable, use defaults
  }

  return DEFAULT_CATALOG
}

// ─── Get specific category items ────────────────────────────────────────
export async function getCatalogItems(category: string): Promise<CatalogItem[]> {
  const catalog = await getCatalog()
  const cat = catalog.find(c => c.category === category)
  return cat?.items?.filter(i => i.active !== false) || []
}

// ─── Invalidate cache ───────────────────────────────────────────────────
export function invalidateCatalogCache() {
  catalogCache = null
  cacheTime = 0
}

// ─── Get all category keys ──────────────────────────────────────────────
export function getCatalogCategories(): { key: string; label: string }[] {
  return DEFAULT_CATALOG.map(c => ({ key: c.category, label: c.label }))
}
