// ─── RMASC FACTORY — Zod Validation Schemas ──────────────────────────────
import { z } from 'zod'

// ═══ USERS ═══════════════════════════════════════════════════════════════
export const loginSchema = z.object({
  loginId: z.string().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const changePasswordSchema = z.object({
  newPassword: z.string().min(4, 'Mot de passe min. 4 caractères'),
})

export const changeAdminCredentialsSchema = z.object({
  currentLoginId: z.string().min(1),
  currentPassword: z.string().min(1),
  newLoginId: z.string().optional(),
  newPassword: z.string().optional(),
})

// ═══ ORDERS ══════════════════════════════════════════════════════════════
const statusEnum = z.enum(['BROUILLON','ATTENTE_DESSIN_TECH','ATTENTE_APPROBATION_ADMIN','ATTENTE_DESSIN_2D','ATTENTE_VERIFICATION','PRET_POUR_PRODUCTION','EN_LIVRAISON','LIVREE','VALIDEE','ANNULEE'])
const priorityEnum = z.enum(['URGENT','HAUTE','NORMAL','BASSE'])
const productionPhaseEnum = z.enum(['decoupe','pliage','soudeur','peinture','assemblage','emballage','livraison'])

export const createOrderSchema = z.object({
  clientName: z.string().min(1, 'Nom client requis'),
  clientEmail: z.string().email().optional().or(z.literal('')).or(z.literal(undefined)),
  clientPhone: z.string().min(1, 'Téléphone requis'),
  clientPhone2: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  clientCity: z.string().min(1, 'Ville requise'),
  serialNumber: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  projectName: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  notes: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  priority: priorityEnum.default('NORMAL'),
  typeMotorisation: z.string().min(1, 'Type motorisation requis'),
  sousTypeElectrique: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  vitesseMs: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  nombreEtages: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  largeurGaineMm: z.string().min(1, 'Largeur gaine requise'),
  profondeurGaineMm: z.string().min(1, 'Profondeur gaine requise'),
  hauteurGaineMm: z.string().min(1, 'Hauteur gaine requise'),
  profondeurCuvetteMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  hauteurDernierEtageMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  contrepoidsPosition: z.string().optional(),
  positionContrepoids: z.string().optional(),
  largeurCabineCalculeeMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  profondeurCabineCalculeeMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  materiauCabine: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  materiauPortes: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  materiauParois: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  materiauSol: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  typeCabine: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  typePorte: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  finitionPorteCabine: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  typeChassisArcade: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  finitionInterieurCabine: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  revetementSol: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  largeurPassageLibreMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  hauteurUtileCabineMm: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  typeSuspensionGuidage: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  systemeSurcharge: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  lifecycleStage: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  engineeredBy: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  totalCostDZD: z.number().optional().or(z.literal(undefined)),
  salePriceDZD: z.number().optional().or(z.literal(undefined)),
  marginPct: z.number().optional().or(z.literal(undefined)),
  optPanoramique: z.boolean().optional().default(false),
  optSecours: z.boolean().optional().default(false),
  optAnnoncesVocales: z.boolean().optional().default(false),
  optCctv: z.boolean().optional().default(false),
  optPortesCoupeFeu: z.boolean().optional().default(false),
  optPanneauTactile: z.boolean().optional().default(false),
  optVentilation: z.boolean().optional().default(false),
  optBarreaudage: z.boolean().optional().default(false),
  optAlarme: z.boolean().optional().default(false),
})

export const updateOrderSchema = z.object({
  status: statusEnum.optional(),
  productionPhase: productionPhaseEnum.optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')).or(z.literal(undefined)),
  clientPhone: z.string().optional(),
  clientCity: z.string().optional(),
  serialNumber: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
  priority: priorityEnum.optional(),
}).passthrough()

export const updateStatusSchema = z.object({
  status: statusEnum,
})

export const updateProductionPhaseSchema = z.object({
  productionPhase: productionPhaseEnum,
})

// ═══ STOCK ═══════════════════════════════════════════════════════════════
export const createStockItemSchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  category: z.string().min(1, 'Catégorie requise'),
  unit: z.string().default('Unité'),
  quantity: z.number().default(0),
  alertThreshold: z.number().default(5),
  unitPrice: z.number().optional().or(z.literal(undefined)),
  imageUrl: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  location: z.string().default('Stock 1'),
  supplier: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
})

export const createMovementSchema = z.object({
  type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT']),
  quantity: z.number().positive('Quantité doit être positive'),
  itemId: z.string().min(1, 'Article requis'),
  orderId: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  supplierId: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  reference: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  notes: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  unitPrice: z.number().optional().default(0),
  totalPrice: z.number().optional().default(0),
  performedBy: z.string().optional(),
})

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nom fournisseur requis'),
  contactName: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  email: z.string().email().optional().or(z.literal('')).or(z.literal(undefined)),
  phone: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  address: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  notes: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
})

export const createStockDocumentSchema = z.object({
  documentType: z.enum(['BON_COMMANDE','BON_LIVRAISON','FACTURE','BON_SORTIE','INVENTAIRE']),
  documentNumber: z.string().min(1, 'N° document requis'),
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  supplierId: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  totalHT: z.number().optional().default(0),
  totalTVA: z.number().optional().default(0),
  totalTTC: z.number().optional().default(0),
  status: z.enum(['BROUILLON','EN_ATTENTE','VALIDE','ANNULE']).optional().default('EN_ATTENTE'),
})

export const bonCommandeSchema = z.object({
  documentNumber: z.string().min(1),
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  supplierId: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  totalHT: z.number().optional().default(0),
  totalTTC: z.number().optional().default(0),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().default(0),
    totalPrice: z.number().default(0),
  })).min(1, 'Au moins un article requis'),
})

export const imageUploadSchema = z.object({
  imageBase64: z.string().min(1, 'imageBase64 requis'),
  mimeType: z.string().optional(),
})

// ═══ STANDALONE PARTS ════════════════════════════════════════════════════
export const createPartSchema = z.object({
  projectName: z.string().min(1, 'Nom du projet requis'),
  material: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  thickness: z.string().optional().or(z.literal('')).or(z.literal(undefined)),
  quantity: z.string().optional().default('1'),
})

export const updatePartStatusSchema = z.object({
  status: z.enum(['EN_ATTENTE', 'EN_PRODUCTION', 'TERMINE']),
})
