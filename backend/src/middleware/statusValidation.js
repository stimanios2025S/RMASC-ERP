// ─── RMASC FACTORY — Status Transition State Machine ────────────────────────
// Enforces the elevator order lifecycle: no stage can be skipped.
// Each role can only advance orders that are in their assigned stage.

// Valid transitions (from → to)
const VALID_TRANSITIONS = {
  BROUILLON: ['ATTENTE_DESSIN_TECH'],
  ATTENTE_DESSIN_TECH: ['ATTENTE_APPROBATION_ADMIN', 'ANNULEE'],
  ATTENTE_APPROBATION_ADMIN: ['ATTENTE_DESSIN_2D', 'ATTENTE_DESSIN_TECH', 'ANNULEE'], // Admin can approve → 2D, or reject → back to tech
  ATTENTE_DESSIN_2D: ['ATTENTE_VERIFICATION', 'ANNULEE'],
  ATTENTE_VERIFICATION: ['PRET_POUR_PRODUCTION', 'ATTENTE_DESSIN_2D', 'ANNULEE'], // Verifier can send back to 2D
  PRET_POUR_PRODUCTION: ['EN_LIVRAISON', 'ANNULEE'],
  EN_LIVRAISON: ['LIVREE', 'ANNULEE'],
  LIVREE: ['VALIDEE'], // Only admin can validate after delivery
  VALIDEE: [],         // Terminal state
  ANNULEE: [],         // Terminal state
}

// Role required for each transition target
const TRANSITION_ROLES = {
  ATTENTE_DESSIN_TECH: null,        // Any role can create a draft → tech
  ATTENTE_APPROBATION_ADMIN: 'INGENIEUR_1', // Ing 1 sends plan to admin
  ATTENTE_DESSIN_2D: 'ADMIN',       // Admin approves → moves to 2D
  ATTENTE_VERIFICATION: 'INGENIEUR_2', // Ing 2 sends to verification
  PRET_POUR_PRODUCTION: 'VERIFICATEUR', // Verifier approves → production
  EN_LIVRAISON: 'PRODUCTION',       // Production marks for delivery
  LIVREE: 'ADMIN',                  // Admin confirms delivery
  VALIDEE: 'ADMIN',                 // Admin final validation
  ANNULEE: 'ADMIN',                 // Only admin can cancel
}

// Human-readable labels for statuses
const STATUS_LABELS = {
  BROUILLON: 'Brouillon',
  ATTENTE_DESSIN_TECH: 'Plan Installation Technique',
  ATTENTE_APPROBATION_ADMIN: 'Approbation Administration',
  ATTENTE_DESSIN_2D: 'Dessin 2D Cabine',
  ATTENTE_VERIFICATION: 'Vérification Finale',
  PRET_POUR_PRODUCTION: 'Prêt pour Production',
  EN_LIVRAISON: 'En Cours de Livraison',
  LIVREE: 'Livrée',
  VALIDEE: 'Validée / Archivée',
  ANNULEE: 'Annulée',
}

/**
 * Middleware: validates that a status transition is allowed.
 * Reads current status from the Order document and new status from req.body.status.
 * Must be used AFTER the order is loaded into req.order.
 */
export function validateStatusTransition(req, res, next) {
  const currentStatus = req.order?.status
  const newStatus = req.body?.status

  if (!currentStatus) {
    return res.status(400).json({ error: 'Statut actuel de la commande non disponible.' })
  }

  if (!newStatus) {
    return res.status(400).json({ error: 'Nouveau statut requis.' })
  }

  // ── Check if transition is valid ────────────────────────────────────────
  const allowedTransitions = VALID_TRANSITIONS[currentStatus]
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    const allowedLabels = (allowedTransitions || []).map(s => STATUS_LABELS[s] || s).join(', ')
    return res.status(409).json({
      error: `Transition invalide : "${STATUS_LABELS[currentStatus] || currentStatus}" → "${STATUS_LABELS[newStatus] || newStatus}".`,
      allowedTransitions: allowedLabels,
      currentStatus,
    })
  }

  // ── Check role authorization ────────────────────────────────────────────
  const requiredRole = TRANSITION_ROLES[newStatus]
  const userRole = req.user?.role

  if (requiredRole && userRole !== requiredRole && userRole !== 'ADMIN') {
    return res.status(403).json({
      error: `Seul le rôle "${requiredRole}" peut effectuer cette transition. Votre rôle: "${userRole}".`,
      requiredRole,
    })
  }

  next()
}

/**
 * Middleware: loads the order by ID from req.params.id into req.order.
 * Must be used BEFORE validateStatusTransition.
 */
export async function loadOrder(req, res, next) {
  try {
    const Order = (await import('../models/Order.js')).default
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' })
    }
    req.order = order
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

export { VALID_TRANSITIONS, TRANSITION_ROLES, STATUS_LABELS }
