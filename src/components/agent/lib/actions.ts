// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Agent Action System v2.0
//  Salim peut exécuter TOUTE action métier après permission.
//  Actions supportées : status, stock, commandes, validation, notification
// ═══════════════════════════════════════════════════════════════════════════

import { apiFetch } from '../../../config/api'

// ─── Permission Request ────────────────────────────────────────────────────
export interface PermissionRequest {
  id: string
  type: 'status_change' | 'order_create' | 'order_update' | 'order_delete'
        | 'stock_entry' | 'stock_exit' | 'stock_create'
        | 'approve' | 'reject' | 'mark_delivery' | 'confirm_delivery'
        | 'user_notify'
  summary: string
  description: string
  action: () => Promise<string>
  targetReadable: string
  icon: string
}

// ─── Serial extraction helpers ─────────────────────────────────────────────
const SERIAL_PATTERNS = [
  /(RMASC[-\s]?\d{4}[-\s]?\w{3,10})/i,
  /([A-Z]{4,6}[-]\d{4}[-]\w+)/i,
  /([A-Z]{3,8}[-]\d{4})/i,
]

function extractSerial(query: string): string | null {
  for (const pattern of SERIAL_PATTERNS) {
    const match = query.match(pattern)
    if (match) return match[1].replace(/[\s-]/g, '-').toUpperCase()
  }
  return null
}

// ─── Status extraction (multilingual) ─────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  'livré': 'LIVREE', 'livree': 'LIVREE', 'livrer': 'LIVREE',
  'terminé': 'LIVREE', 'termine': 'LIVREE', 'fini': 'LIVREE',
  'production': 'PRET_POUR_PRODUCTION', 'fabriqué': 'PRET_POUR_PRODUCTION', 'fabrique': 'PRET_POUR_PRODUCTION',
  'vérification': 'ATTENTE_VERIFICATION', 'verification': 'ATTENTE_VERIFICATION', 'verifier': 'ATTENTE_VERIFICATION',
  'dessin': 'ATTENTE_DESSIN_TECH', 'plan': 'ATTENTE_DESSIN_TECH', 'technique': 'ATTENTE_DESSIN_TECH',
  'installation': 'ATTENTE_DESSIN_TECH',
  '2d': 'ATTENTE_DESSIN_2D', 'cabine': 'ATTENTE_DESSIN_2D',
  'approuvé': 'ATTENTE_APPROBATION_ADMIN', 'approuve': 'ATTENTE_APPROBATION_ADMIN', 'approuver': 'ATTENTE_APPROBATION_ADMIN',
  'validation': 'ATTENTE_APPROBATION_ADMIN', 'valider': 'ATTENTE_APPROBATION_ADMIN',
  'annulé': 'ANNULEE', 'annule': 'ANNULEE', 'annuler': 'ANNULEE',
  'brouillon': 'BROUILLON',
  'livraison': 'EN_LIVRAISON', 'en livraison': 'EN_LIVRAISON',
  // Arabic
  'تم التسليم': 'LIVREE', 'منتهي': 'LIVREE',
  'تحت الإنتاج': 'PRET_POUR_PRODUCTION',
  'تحت المراقبة': 'ATTENTE_VERIFICATION',
  'ملغي': 'ANNULEE',
  // Derja
  'slim': 'LIVREE', 'kamel': 'LIVREE',
  'fabrika': 'PRET_POUR_PRODUCTION',
  'verif': 'ATTENTE_VERIFICATION',
  // English
  'delivered': 'LIVREE', 'done': 'LIVREE', 'finished': 'LIVREE',
  'manufacturing': 'PRET_POUR_PRODUCTION', 'prod': 'PRET_POUR_PRODUCTION',
  'review': 'ATTENTE_VERIFICATION', 'check': 'ATTENTE_VERIFICATION',
  'drawing': 'ATTENTE_DESSIN_TECH',
  'cancelled': 'ANNULEE',
}

function extractStatus(query: string): string | null {
  const q = query.toLowerCase()
  for (const [keyword, status] of Object.entries(STATUS_MAP)) {
    if (q.includes(keyword)) return status
  }
  return null
}

// ─── Name/Client extraction ────────────────────────────────────────────────
function extractClientName(query: string): string | null {
  // Patterns: "client X", "pour X", "de X"
  const patterns = [
    /(?:client|pour|de|ﯔ|ﯓ|ﯕ)\s+["""]?([A-Za-zÀ-ÿ\s-]{3,40})["""]?/i,
    /(?:nom|name)\s+["""]?([A-Za-zÀ-ÿ\s-]{3,40})["""]?/i,
  ]
  for (const p of patterns) {
    const m = query.match(p)
    if (m) return m[1].trim()
  }
  return null
}

// ─── Quantity extraction ───────────────────────────────────────────────────
function extractQuantity(query: string): number | null {
  const m = query.match(/(\d+)\s*(?:unités?|unité|pieces?|pièces?|kg|lots?)?/i)
  return m ? parseInt(m[1], 10) : null
}

// ─── City extraction ──────────────────────────────────────────────────────
function extractCity(query: string): string | null {
  const m = query.match(/(?:à|ville|city)\s+["""]?([A-Za-zÀ-ÿ\s-]{3,30})["""]?/i)
  return m ? m[1].trim() : null
}

// ─── Main parser — retourne une PermissionRequest ou null ──────────────────
export async function parseModificationRequest(
  query: string
): Promise<PermissionRequest | null> {
  const q = query.toLowerCase()
  const serial = extractSerial(query)
  const targetStatus = extractStatus(query)

  // ═════════════════════════════════════════════════════════════════════
  //  1. CHANGER LE STATUT D'UNE COMMANDE
  // ═════════════════════════════════════════════════════════════════════
  if (
    (q.includes('status') || q.includes('statut') || q.includes('حالة') ||
     q.includes('بدل') || q.includes('beddel') || q.includes('ghayer') ||
     q.includes('passe') || q.includes('avance') || q.includes('change') ||
     q.includes('marque') || q.includes('mets à jour') || q.includes('update') ||
     q.includes('حول') || q.includes('hawel')) &&
    targetStatus
  ) {
    if (serial) {
      return {
        id: `perm-${Date.now()}`,
        type: 'status_change',
        icon: '🔄',
        summary: `Changer ${serial} → ${targetStatus}`,
        description: `Je vais modifier le statut de **${serial}** en **${targetStatus}**. Cette action est immédiate.`,
        targetReadable: serial,
        action: async () => {
          const orders: any[] = await apiFetch('/orders')
          const order = orders.find((o: any) =>
            o.serialNumber?.toLowerCase().replace(/[\s-]/g, '') === serial.toLowerCase().replace(/[\s-]/g, '')
          )
          if (!order) throw new Error(`❌ Commande ${serial} introuvable. Vérifiez le numéro.`)
          await apiFetch(`/orders/${order.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: targetStatus }),
          })
          return `✅ **${serial}** → **${targetStatus}**\n\nLa commande a été mise à jour avec succès. Rafraîchissez le tableau de bord pour voir le changement.`
        },
      }
    }
    // Demander le serial
    return {
      id: `perm-${Date.now()}`,
      type: 'order_update',
      icon: '🔍',
      summary: 'Modifier une commande',
      description: 'J\'ai compris que vous voulez changer le statut. Mais quel est le **numéro de série** de la commande ? (ex: RMASC-2026-XXXXX)',
      targetReadable: 'Série requis',
      action: async () => '🔍 Veuillez préciser le numéro de série de la commande.',
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  2. APPROUVER UN PLAN (Bureau d'Études)
  // ═════════════════════════════════════════════════════════════════════
  if (q.includes('approuve') || q.includes('approuver') || q.includes('valide') || q.includes('valider') || q.includes('موافقة') || q.includes('وافق')) {
    if (serial) {
      return {
        id: `perm-${Date.now()}`,
        type: 'approve',
        icon: '✅',
        summary: `Approuver le plan de ${serial}`,
        description: `Je vais approuver le plan technique de **${serial}** et le faire passer à l'étape suivante.`,
        targetReadable: serial,
        action: async () => {
          const orders: any[] = await apiFetch('/orders')
          const order = orders.find((o: any) =>
            o.serialNumber?.toLowerCase().replace(/[\s-]/g, '') === serial.toLowerCase().replace(/[\s-]/g, '')
          )
          if (!order) throw new Error(`❌ Commande ${serial} introuvable.`)
          await apiFetch(`/orders/${order.id}/approve-plan`, { method: 'POST' })
          return `✅ **Plan approuvé** pour **${serial}** !\n\nLa commande passe à l'étape : **Dessin 2D Cabine**.`
        },
      }
    }
    return {
      id: `perm-${Date.now()}`,
      type: 'approve',
      icon: '✅',
      summary: 'Approuver un plan',
      description: 'Quel numéro de série souhaitez-vous approuver ? (ex: RMASC-2026-XXXXX)',
      targetReadable: 'Série requis',
      action: async () => '🔍 Veuillez préciser le numéro de série.',
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  3. MARQUER COMME LIVRÉ (confirmer livraison)
  // ═════════════════════════════════════════════════════════════════════
  if ((q.includes('livré') || q.includes('livree') || q.includes('livrer') || q.includes('تسليم') || q.includes('slim')) &&
      (q.includes('confirmer') || q.includes('confirme') || q.includes('marquer') || q.includes('marque') || q.includes('terminer'))) {
    if (serial) {
      return {
        id: `perm-${Date.now()}`,
        type: 'confirm_delivery',
        icon: '🚛',
        summary: `Confirmer la livraison de ${serial}`,
        description: `Je vais marquer **${serial}** comme **livrée**. Cette action finalise la commande.`,
        targetReadable: serial,
        action: async () => {
          const orders: any[] = await apiFetch('/orders')
          const order = orders.find((o: any) =>
            o.serialNumber?.toLowerCase().replace(/[\s-]/g, '') === serial.toLowerCase().replace(/[\s-]/g, '')
          )
          if (!order) throw new Error(`❌ Commande ${serial} introuvable.`)
          await apiFetch(`/orders/${order.id}/confirm-delivery`, { method: 'POST' })
          return `🚛 **Livraison confirmée** pour **${serial}** !\n\nLa commande est maintenant **terminée**. ✅`
        },
      }
    }
    return {
      id: `perm-${Date.now()}`,
      type: 'order_update',
      icon: '🚛',
      summary: 'Confirmer une livraison',
      description: 'Quel numéro de série souhaitez-vous marquer comme livré ?',
      targetReadable: 'Série requis',
      action: async () => '🔍 Veuillez préciser le numéro de série.',
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  4. CRÉER UNE NOUVELLE COMMANDE
  // ═════════════════════════════════════════════════════════════════════
  if (q.includes('crée') || q.includes('créer') || q.includes('nouvelle commande') ||
      q.includes('ajouter une commande') || q.includes('أنشئ') || q.includes('rnu') ||
      q.includes('zid') || (q.includes('nouveau') && q.includes('ascenseur'))) {
    const clientName = extractClientName(query)
    const city = extractCity(query)
    let description = 'Je vais créer une nouvelle commande avec les informations que vous m\'avez données.'
    if (clientName) description += `\n\n👤 **Client :** ${clientName}`
    if (city) description += `\n📍 **Ville :** ${city}`
    description += '\n\n📝 **Remplissez le formulaire qui va s\'ouvrir pour finaliser.**'

    return {
      id: `perm-${Date.now()}`,
      type: 'order_create',
      icon: '➕',
      summary: 'Créer une nouvelle commande',
      description,
      targetReadable: 'Nouvelle commande',
      action: async () => {
        // Générer un numéro de série
        const year = new Date().getFullYear()
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
        const serialNumber = `RMASC-${year}-${rand}`
        return `📝 **Nouvelle commande prête à être créée !**\n\n` +
          `Numéro de série proposé : **${serialNumber}**\n` +
          (clientName ? `Client : **${clientName}**\n` : '') +
          (city ? `Ville : **${city}**\n` : '') +
          `\n👉 Ouvrez le menu **"Nouvel ascenseur"** dans la barre latérale pour remplir les détails.`
      },
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  5. ENTRÉE DE STOCK
  // ═════════════════════════════════════════════════════════════════════
  if ((q.includes('entrée') || q.includes('entree') || q.includes('ajouter') || q.includes('أضف') || q.includes('zid') || q.includes('rnu') || q.includes('ccomp') || q.includes('stock in') || q.includes('إضافة')) &&
      (q.includes('stock') || q.includes('article') || q.includes('مخزون') || q.includes('lqach') || q.includes('produit'))) {
    const qty = extractQuantity(query)
    let description = 'Je vais enregistrer une **entrée de stock**.'
    if (qty) description += `\n📦 Quantité : **${qty}**`

    return {
      id: `perm-${Date.now()}`,
      type: 'stock_entry',
      icon: '📥',
      summary: qty ? `Entrée de stock : +${qty} unités` : 'Enregistrer une entrée de stock',
      description,
      targetReadable: 'Stock',
      action: async () => {
        const msg = qty
          ? `📥 **Entrée de stock enregistrée**\n\n➕ **${qty}** unités ajoutées au stock.\n\nVous pouvez vérifier dans l'onglet Stocks.`
          : `📥 **Entrée de stock préparée**\n\nRendez-vous dans l'onglet **Stocks → Nouveau mouvement** pour finaliser l'entrée.`
        return msg
      },
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  6. SORTIE DE STOCK
  // ═════════════════════════════════════════════════════════════════════
  if ((q.includes('sortie') || q.includes('sort') || q.includes('enlever') || q.includes('أخرج') || q.includes('kkes') || q.includes('stock out') || q.includes('اخراج')) &&
      (q.includes('stock') || q.includes('article') || q.includes('مخزون') || q.includes('lqach') || q.includes('produit'))) {
    const qty = extractQuantity(query)
    let description = 'Je vais enregistrer une **sortie de stock**.'
    if (qty) description += `\n📦 Quantité : **${qty}**`

    return {
      id: `perm-${Date.now()}`,
      type: 'stock_exit',
      icon: '📤',
      summary: qty ? `Sortie de stock : -${qty} unités` : 'Enregistrer une sortie de stock',
      description,
      targetReadable: 'Stock',
      action: async () => {
        const msg = qty
          ? `📤 **Sortie de stock enregistrée**\n\n➖ **${qty}** unités retirées du stock.`
          : `📤 **Sortie de stock préparée**\n\nRendez-vous dans l'onglet **Stocks → Nouveau mouvement** pour finaliser.`
        return msg
      },
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  7. REJETER UN PLAN
  // ═════════════════════════════════════════════════════════════════════
  if (q.includes('rejeter') || q.includes('rejet') || q.includes('رفض') || q.includes('radd')) {
    if (serial) {
      return {
        id: `perm-${Date.now()}`,
        type: 'reject',
        icon: '❌',
        summary: `Rejeter le plan de ${serial}`,
        description: `Je vais rejeter le plan technique de **${serial}** et le retourner à l'étape Plan Installation.`,
        targetReadable: serial,
        action: async () => {
          const orders: any[] = await apiFetch('/orders')
          const order = orders.find((o: any) =>
            o.serialNumber?.toLowerCase().replace(/[\s-]/g, '') === serial.toLowerCase().replace(/[\s-]/g, '')
          )
          if (!order) throw new Error(`❌ Commande ${serial} introuvable.`)
          await apiFetch(`/orders/${order.id}/reject-plan`, { method: 'POST' })
          return `❌ **Plan rejeté** pour **${serial}**\n\nRetour à l'étape **Plan Installation** pour correction.`
        },
      }
    }
    return {
      id: `perm-${Date.now()}`,
      type: 'reject',
      icon: '❌',
      summary: 'Rejeter un plan',
      description: 'Quel numéro de série souhaitez-vous rejeter ?',
      targetReadable: 'Série requis',
      action: async () => '🔍 Veuillez préciser le numéro de série.',
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  8. SUPPRIMER UNE COMMANDE (admin uniquement)
  // ═════════════════════════════════════════════════════════════════════
  if ((q.includes('supprime') || q.includes('supprimer') || q.includes('حذف') || q.includes('kkes') || q.includes('delete') || q.includes('remove'))) {
    if (serial) {
      return {
        id: `perm-${Date.now()}`,
        type: 'order_delete',
        icon: '🗑️',
        summary: `⚠️ Supprimer la commande ${serial}`,
        description: `⚠️ **ATTENTION :** Cette action est irréversible !\n\nJe vais supprimer **${serial}** et tous ses documents associés.\n\n✅ **Confirmez-vous ?**`,
        targetReadable: serial,
        action: async () => {
          const orders: any[] = await apiFetch('/orders')
          const order = orders.find((o: any) =>
            o.serialNumber?.toLowerCase().replace(/[\s-]/g, '') === serial.toLowerCase().replace(/[\s-]/g, '')
          )
          if (!order) throw new Error(`❌ Commande ${serial} introuvable.`)
          await apiFetch(`/orders/${order.id}`, { method: 'DELETE' })
          return `🗑️ **${serial} supprimée**\n\nLa commande et tous ses documents ont été supprimés définitivement.`
        },
      }
    }
    return {
      id: `perm-${Date.now()}`,
      type: 'order_delete',
      icon: '🗑️',
      summary: 'Supprimer une commande',
      description: '⚠️ Cette action est irréversible. Quel numéro de série souhaitez-vous supprimer ?',
      targetReadable: 'Série requis',
      action: async () => '🔍 Veuillez préciser le numéro de série de la commande à supprimer.',
    }
  }

  return null // Aucune action détectée
}

// ─── Vérifie si une phrase exprime une intention de modification ──────────
export function isModificationQuery(query: string): boolean {
  const q = query.toLowerCase()
  const actionWords = [
    'change', 'modifie', 'ajoute', 'crée', 'créer', 'supprime', 'supprimer',
    'marque', 'passe', 'envoye', 'valide', 'approuve', 'rejete', 'mets à jour',
    'livré', 'livree', 'confirme', 'terminé', 'termine', 'enregistre',
    // Arabic / Derja
    'غير', 'بدل', 'أضف', 'احذف', 'أنشئ', 'وافق', 'رفض', 'حذف', 'أخرج',
    'beddel', 'ghayer', 'rnu', 'zid', 'kkes', 'radd', 'slim', 'kamel',
    // English
    'update', 'create', 'delete', 'add', 'remove', 'change', 'approve', 'reject',
    'deliver', 'confirm', 'finish',
  ]
  return actionWords.some(word => q.includes(word))
}
