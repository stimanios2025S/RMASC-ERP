// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Salim's Conversation Engine
//  Multi-turn dialogue: Salim asks questions, remembers answers, acts.
//  Flows: Order creation, stock entry, guided search...
// ═══════════════════════════════════════════════════════════════════════════

import { apiFetch } from '../../../config/api'

// ─── Conversation state (stored in React component) ──────────────────────
export interface ConversationState {
  active: boolean
  flow: 'create_order' | 'stock_entry' | 'guided_search' | null
  step: number
  data: Record<string, any>
  totalSteps: number
  questions: string[]
}

// ─── All available flows ──────────────────────────────────────────────────

const FLOWS = {
  create_order: {
    title: '📝 Création de commande',
    steps: [
      { key: 'clientName', question: "👤 **Nom du client** — C'est pour quelle entreprise ?" },
      { key: 'clientCity', question: "📍 **Ville** — Où est situé le client ?" },
      { key: 'clientPhone', question: "📞 **Téléphone** — Un numéro de contact ?" },
      { key: 'typeMotorisation', question: "⚡ **Motorisation** — Gearless, hydraulique ou électrique ?" },
      { key: 'sousTypeElectrique', question: "🔌 **Sous-type** — Si c'est électrique, précise (ex: 2 vitesses, variateur) ? (sinon tape 'aucun')" },
      { key: 'dimensions', question: "📏 **Dimensions** — Largeur, profondeur et hauteur de la gaine en mm ? (ex: 2000x1800x25000 ou 'je sais pas')" },
      { key: 'nombreEtages', question: "🏗️ **Nombre d'étages** — Combien d'étages desservis ?" },
      { key: 'vitesseMs', question: "⚡ **Vitesse** — En m/s ? (ex: 1.0, 1.5, 2.5)" },
      { key: 'materiauCabine', question: "🎨 **Matériau cabine** — Acier inox, verre, ou autre ?" },
      { key: 'materiauPortes', question: "🚪 **Portes** — Type de portes palières ? (ex: automatiques, manuelles)" },
    ],
    totalSteps: 10,
  },
}

// ─── Start a flow ────────────────────────────────────────────────────────
export function startFlow(
  type: 'create_order' | 'stock_entry' | 'guided_search',
  initialData: Record<string, any> = {}
): { state: ConversationState; firstResponse: string } {
  const flow = FLOWS[type]
  if (!flow) throw new Error(`Flow ${type} not found`)

  const state: ConversationState = {
    active: true,
    flow: type,
    step: 0,
    data: initialData,
    totalSteps: flow.totalSteps,
    questions: flow.steps.map(s => s.question),
  }

  return {
    state,
    firstResponse: `D'accord, je vais te guider pas à pas ! 😎\n\n${flow.title}\n━━━━━━━━━━━━━━━━━━━━━━\n\n**Étape 1/${flow.totalSteps} :**\n${flow.steps[0].question}`,
  }
}

// ─── Process a response in the current flow ──────────────────────────────
export async function processFlowStep(
  state: ConversationState,
  userInput: string
): Promise<{
  newState: ConversationState
  response: string
  completed?: boolean
  result?: any
}> {
  const flow = FLOWS[state.flow as keyof typeof FLOWS]
  if (!flow) return { newState: state, response: '❌ Flow inconnu. Je recommence ?' }

  const stepIndex = state.step
  const step = flow.steps[stepIndex]
  if (!step) return { newState: state, response: '❌ Oups, y\'a un bug dans mon déroulé.' }

  const input = userInput.trim()

  // ── Store the answer ────────────────────────────────────────────────
  const newData = { ...state.data }

  if (step.key === 'clientName') {
    newData.clientName = input
  } else if (step.key === 'clientCity') {
    newData.clientCity = input
  } else if (step.key === 'clientPhone') {
    newData.clientPhone = input.replace(/[^0-9+\-\s]/g, '') || '+213 XX XX XX XX'
  } else if (step.key === 'typeMotorisation') {
    const motor = input.toLowerCase()
    if (motor.includes('gear') || motor.includes('sans') || motor.includes('machine')) newData.typeMotorisation = 'Gearless'
    else if (motor.includes('hydrau') || motor.includes('huile')) newData.typeMotorisation = 'Hydraulique'
    else newData.typeMotorisation = input.charAt(0).toUpperCase() + input.slice(1)
  } else if (step.key === 'sousTypeElectrique') {
    newData.sousTypeElectrique = input.toLowerCase() === 'aucun' ? '' : input
  } else if (step.key === 'dimensions') {
    if (input.toLowerCase().includes('x') || input.toLowerCase().includes('*')) {
      const parts = input.split(/[xX*]/).map((s: string) => s.trim())
      newData.largeurGaineMm = parts[0] || ''
      newData.profondeurGaineMm = parts[1] || ''
      newData.hauteurGaineMm = parts[2] || ''
    } else if (input.toLowerCase().includes('pas') || input.toLowerCase().includes('sais')) {
      newData.largeurGaineMm = ''
      newData.profondeurGaineMm = ''
      newData.hauteurGaineMm = ''
    } else {
      newData.largeurGaineMm = input
    }
  } else if (step.key === 'nombreEtages') {
    const floors = parseInt(input, 10)
    newData.nombreEtages = isNaN(floors) ? 2 : floors
  } else if (step.key === 'vitesseMs') {
    const speed = parseFloat(input.replace(',', '.'))
    newData.vitesseMs = isNaN(speed) ? 1.0 : speed
  } else if (step.key === 'materiauCabine') {
    newData.materiauCabine = input
  } else if (step.key === 'materiauPortes') {
    newData.materiauPortes = input
  }

  // ── Next step ───────────────────────────────────────────────────────
  const nextStepIndex = stepIndex + 1

  if (nextStepIndex >= flow.totalSteps) {
    // ── FLOW COMPLETE — summary & confirmation ────────────────────────
    const serialNumber = `RMASC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`

    const summaryLines: string[] = [
      `📋 **RÉSUMÉ DE LA COMMANDE**`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `👤 **Client :** ${newData.clientName || '—'}`,
      `📍 **Ville :** ${newData.clientCity || '—'}`,
      `📞 **Tél :** ${newData.clientPhone || '—'}`,
      ``,
      `⚡ **Motorisation :** ${newData.typeMotorisation || '—'}`,
      `🔌 **Sous-type :** ${newData.sousTypeElectrique || 'Standard'}`,
      `📏 **Gaine :** ${newData.largeurGaineMm || '?'} x ${newData.profondeurGaineMm || '?'} x ${newData.hauteurGaineMm || '?'} mm`,
      `🏗️ **Étages :** ${newData.nombreEtages || '—'}`,
      `⚡ **Vitesse :** ${newData.vitesseMs || '—'} m/s`,
      `🎨 **Cabine :** ${newData.materiauCabine || '—'}`,
      `🚪 **Portes :** ${newData.materiauPortes || '—'}`,
      ``,
      `🔢 **Série proposé :** \`${serialNumber}\``,
    ]

    const newState: ConversationState = {
      ...state,
      active: false,
      step: nextStepIndex,
      data: { ...newData, serialNumber },
    }

    return {
      newState,
      response: `✅ **Super, j'ai toutes les infos !** 🙌\n\n${summaryLines.join('\n')}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ **Je crée la commande ?** Dis "oui" ou "confirme" et je m'en occupe !`,
      completed: true,
      result: { ...newData, serialNumber },
    }
  }

  // ── Still in progress ──────────────────────────────────────────────
  const newState: ConversationState = {
    ...state,
    step: nextStepIndex,
    data: newData,
  }

  return {
    newState,
    response: `✅ **OK, pris en compte !**\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n**Étape ${nextStepIndex + 1}/${flow.totalSteps} :**\n${flow.steps[nextStepIndex].question}`,
  }
}

// ─── Actually create the order via API ────────────────────────────────────
export async function executeOrderCreation(data: Record<string, any>): Promise<string> {
  try {
    const payload: any = {
      clientName: data.clientName || 'Client',
      clientPhone: data.clientPhone || '+213000000000',
      clientCity: data.clientCity || 'Alger',
      serialNumber: data.serialNumber || `RMASC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      typeMotorisation: data.typeMotorisation || 'Gearless',
      projectName: data.clientName || '',
    }

    if (data.sousTypeElectrique) payload.sousTypeElectrique = data.sousTypeElectrique
    if (data.largeurGaineMm) payload.largeurGaineMm = parseInt(data.largeurGaineMm, 10) || 0
    if (data.profondeurGaineMm) payload.profondeurGaineMm = parseInt(data.profondeurGaineMm, 10) || 0
    if (data.hauteurGaineMm) payload.hauteurGaineMm = parseInt(data.hauteurGaineMm, 10) || 0
    if (data.nombreEtages) payload.nombreEtages = data.nombreEtages
    if (data.vitesseMs) payload.vitesseMs = String(data.vitesseMs)
    if (data.materiauCabine) payload.materiauCabine = data.materiauCabine
    if (data.materiauPortes) payload.materiauPortes = data.materiauPortes

    const result: any = await apiFetch('/orders/create-and-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return `✅ **Commande créée avec succès !**\n\n📋 **${result.order?.serialNumber || data.serialNumber}**\n👤 ${data.clientName}\n📍 ${data.clientCity}\n\n📌 Elle est maintenant en **Attente Plan Installation (Ingénieur 1)**.\n\nTu veux que je fasse autre chose ?`
  } catch (err: any) {
    throw new Error(err.message || 'Erreur lors de la création.')
  }
}
