// ─── Order / Commande — Zod validation schemas ──────────────────────────────
import { z } from 'zod'

// ─── Mekisan Catalog Enums (Zod) ──────────────────────────────────────────
const typeCabineEnum = z.enum(['PASSAGER', 'PANORAMIQUE', 'CHARGES_LOURDES', 'SERVICE_LIFT'])
const typePorteEnum = z.enum(['AUTOMATIQUE_CENTRALE', 'AUTOMATIQUE_TELESCOPIQUE', 'BATTANTE_MANUELLE'])
const finitionPorteCabineEnum = z.enum(['INOX_BROSSE', 'INOX_MIROIR', 'INOX_TEXTURE', 'VITREE_PANORAMIQUE'])
const typeChassisArcadeEnum = z.enum(['TRACTION_ELECTRIQUE_2_1', 'TRACTION_ELECTRIQUE_1_1', 'HYDRAULIQUE_DIRECT', 'HYDRAULIQUE_INDIRECT_RUCKSACK'])
// finitionInterieurCabine and revetementSol use String (not enum) for flexible custom values
const typeSuspensionEnum = z.enum(['PATINS_COULISSANTS', 'GALETS_ROULANTS'])
const systemeSurchargeEnum = z.enum(['CELLULES_SOUS_CABINE', 'CAPTEUR_SUR_CABLE'])

// ─── Create order payload ──────────────────────────────────────────────────
export const createOrderSchema = z.object({
  // ── Client (required except email)
  clientName: z.string().min(1, 'Le nom du client est obligatoire.').max(200),
  clientEmail: z
    .string()
    .email('Email invalide.')
    .optional()
    .or(z.literal(''))
    .catch(undefined)
    .transform((v) => (v === '' ? undefined : v)),
  clientPhone: z.string().min(1, 'Le téléphone est obligatoire.').max(30),
  clientCity: z.string().min(1, 'La ville est obligatoire.').max(100),

  // ── Serial
  serialNumber: z.string().min(1, 'Le numéro de série est obligatoire.').max(50),

  // ── Motorisation
  typeMotorisation: z.enum(['ÉLECTRIQUE', 'HYDRAULIQUE'], {
    errorMap: () => ({ message: 'Le type de motorisation doit être ÉLECTRIQUE ou HYDRAULIQUE.' }),
  }),
  sousTypeElectrique: z.string().optional(),  // Validated conditionally below
  vitesseMs: z.string().optional(),
  nombreEtages: z.string().optional(),

  // ── Dimensions (required)
  largeurGaineMm: z.string().min(1, 'La largeur de gaine est obligatoire.'),
  profondeurGaineMm: z.string().min(1, 'La profondeur de gaine est obligatoire.'),
  hauteurGaineMm: z.string().min(1, 'La hauteur de gaine est obligatoire.'),

  // ── Nouvelles dimensions (optionnelles)
  profondeurCuvetteMm: z.string().optional(),
  hauteurDernierEtageMm: z.string().optional(),

  // ── Contrepoids & Calculs Salim Hamoun AI
  contrepoidsPosition: z.string().optional(),
  positionContrepoids: z.string().optional(),
  largeurCabineCalculeeMm: z.string().optional(),
  profondeurCabineCalculeeMm: z.string().optional(),

  // ── Cycle de vie
  lifecycleStage: z.string().optional(),
  engineeredBy: z.string().optional(),
  totalCostDZD: z.number().optional(),
  salePriceDZD: z.number().optional(),
  marginPct: z.number().optional(),
  completedAt: z.string().optional(),

  // ── Matériaux (optional)
  materiauCabine: z.string().optional(),
  materiauPortes: z.string().optional(),
  materiauParois: z.string().optional(),
  materiauSol: z.string().optional(),

  // ── Mekisan Catalog Fields (all optional)
  typeCabine: typeCabineEnum.optional(),
  typePorte: typePorteEnum.optional(),
  finitionPorteCabine: finitionPorteCabineEnum.optional(),
  typeChassisArcade: typeChassisArcadeEnum.optional(),
  finitionInterieurCabine: z.string().optional(),
  revetementSol: z.string().optional(),

  // ── Mécanique — Passage Libre & Hauteur Utile
  largeurPassageLibreMm: z.string().optional(),
  hauteurUtileCabineMm: z.string().optional(),

  // ── Mécanique — Suspension & Surcharge
  typeSuspensionGuidage: typeSuspensionEnum.optional(),
  systemeSurcharge: systemeSurchargeEnum.optional(),

  // ── Options (booleans, defaults handled by Prisma)
  optPanoramique: z.boolean().optional(),
  optSecours: z.boolean().optional(),
  optAnnoncesVocales: z.boolean().optional(),
  optCctv: z.boolean().optional(),
  optPortesCoupeFeu: z.boolean().optional(),
  optPanneauTactile: z.boolean().optional(),
  optVentilation: z.boolean().optional(),
  optBarreaudage: z.boolean().optional(),
  optAlarme: z.boolean().optional(),
})

// Derived type
export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ─── Conditional validation: sous_type_electrique is required if ÉLECTRIQUE ─
export function validateOrderPayload(data: CreateOrderInput): void {
  if (data.typeMotorisation === 'ÉLECTRIQUE' && (!data.sousTypeElectrique || data.sousTypeElectrique.trim() === '')) {
    throw new OrderValidationError('Le sous-type électrique est obligatoire lorsque le type de motorisation est ÉLECTRIQUE.')
  }
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderValidationError'
  }
}
