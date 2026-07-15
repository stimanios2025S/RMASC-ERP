// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — "Salim" : L'Assistant qui Cause
//  Pas un robot. Pas de limites. Juste un pote qui connaît ton ERP.
//  Parle-lui comme tu veux, en français, arabe, kabyle, darja, anglais.
//  Il rigole, il conseille, il agit. Mais il demande toujours avant.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '../../config/api'
import {
  detectLanguage, detectIntent, translateToFrench, getGreeting,
  queryHasWord, textContains, isGreeting,
  isProductionQuery, isStockQuery, isFinancialQuery,
  isUrgencyQuery, isBEQuery, isActivityQuery, isClientQuery, isHelpQuery,
  type DetectedLang
} from './lib/multilingual'
import { parseModificationRequest, isModificationQuery, type PermissionRequest } from './lib/actions'
import { startFlow, processFlowStep, executeOrderCreation, type ConversationState } from './lib/conversation'
import SpeechInput from './lib/SpeechInput'
import ImageInspector from './lib/ImageInspector'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  data?: any
  lang?: DetectedLang
}

interface QuickAction {
  icon: string
  label: string
  command: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: '📊', label: 'Résumé', command: 'résumé' },
  { icon: '📝', label: 'Nouveau', command: 'crée une nouvelle commande' },
  { icon: '💰', label: 'Finance', command: 'parle moi finances' },
  { icon: '📦', label: 'Stocks', command: 'c\'est quoi le stock ?' },
  { icon: '📐', label: 'BE', command: 'le bureau études, ça donne quoi ?' },
  { icon: '🏆', label: 'Productivité', command: 'on est performants là ?' },
  { icon: '📸', label: 'Image', command: '__image__' },
]

// ─── The brain — natural, open, friendly ──────────────────────────────────
async function processQuery(
  query: string,
  onPermission?: (req: PermissionRequest) => void
): Promise<{ response: string; data?: any; permission?: PermissionRequest }> {
  const q = query.toLowerCase().trim()
  const lang = detectLanguage(query)
  const frenchQuery = translateToFrench(query)
  const intent = detectIntent(frenchQuery)

  // ─── Pas de question vide ──────────────────────────────────────────
  if (!q) {
    return {
      response: `Hééé, t'as rien écrit ! 😄 Tape quelque chose, je suis là pour t'aider. Même "salut" ça marche.`
    }
  }

  try {
    // ─── CRÉER UNE NOUVELLE COMMANDE → Conversation flow ───────────
    if ((q.includes('créer') || q.includes('creer') || q.includes('nouvelle commande') || q.includes('nouveau') || q.includes('ajouter une commande') || q.includes('أنشئ') || q.includes('rnu') || q.includes('zid') || q.includes('create') || q.includes('new order')) &&
        (q.includes('commande') || q.includes('order') || q.includes('ascenseur') || q.includes('طلبية') || q.includes('lift'))) {
      // Extract client name if present
      let clientName = ''
      const patterns = [/pour\s+"?([A-Za-zÀ-ÿ\s-]{2,40})"?/i, /de\s+"?([A-Za-zÀ-ÿ\s-]{2,40})"?/i, /client\s+"?([A-Za-zÀ-ÿ\s-]{2,40})"?/i, /for\s+"?([A-Za-zÀ-ÿ\s-]{2,40})"?/i]
      for (const p of patterns) {
        const m = query.match(p)
        if (m) { clientName = m[1].trim(); break }
      }
      return {
        response: '',
        data: {
          startConversation: true,
          flowType: 'create_order',
          initialData: clientName ? { clientName } : {},
        },
      }
    }

    // ─── ACTION ? L'utilisateur veut qu'on FASS E quelque chose ──────
    if (isModificationQuery(query) || isModificationQuery(frenchQuery) || intent.type === 'modify') {
      const permReq = await parseModificationRequest(query)
      if (permReq) {
        return {
          response: `⏳ **J'ai vu ce que tu veux faire !**\n\n> ${permReq.summary}\n\n${permReq.description}\n\n✅ **Je confirme — t'es sûr ?**`,
          data: permReq,
          permission: permReq,
        }
      }
    }

    // ─── SALUT ────────────────────────────────────────────────────────
    if (isGreeting(frenchQuery) || intent.type === 'greeting') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const total = orders.length
      const terminees = orders.filter((o: any) => ['LIVREE', 'VALIDEE'].includes(o.status)).length
      const greeting = getGreeting(lang)

      let vibes = "ça roule !"
      if (terminees === total && total > 0) vibes = "tout est bouclé, tu gères ! 💪"
      else if (terminees > total / 2) vibes = "bien avancé, continue comme ça 🔥"
      else if (total === 0) vibes = "tranquille, pas de commandes pour l'instant 🍃"

      return {
        response: `${greeting}\n\n👀 **En ce moment chez RMASC :**\n- 📋 **${total}** commandes\n- ✅ **${terminees}** terminées\n- 🔄 **${total - terminees}** en cours\n\n📍 **Vibe du jour :** ${vibes}\n\n💬 **Je parle :** français, arabe, kabyle, darja, anglais.\n🎤 **Tu peux me parler au micro.**\n📸 **M'envoyer une image.**\n⚡ **Me demander d'agir.**\n\n**Alors, qu'est-ce qu'on fait aujourd'hui ?**`,
        data: { total, terminees }
      }
    }

    // ─── RÉSUMÉ ───────────────────────────────────────────────────────
    if (textContains(frenchQuery, 'résumé complet', 'résumé', 'resumé', 'récap', 'recap', 'état des lieux', 'résumé', 'donne moi', 'montre moi', 'rapport', 'vue globale') || intent.type === 'unknown' || q.length < 10) {

      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const total = orders.length
      const terminees = orders.filter((o: any) => ['LIVREE', 'VALIDEE'].includes(o.status)).length
      const enCours = orders.filter((o: any) => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'ATTENTE_APPROBATION_ADMIN', 'EN_LIVRAISON'].includes(o.status)).length
      const brouillon = orders.filter((o: any) => ['BROUILLON', 'PRET_POUR_PRODUCTION'].includes(o.status)).length
      const urgentes = orders.filter((o: any) => o.priority === 'URGENT').length
      const prog = total > 0 ? Math.round((terminees / total) * 100) : 0

      let response = `📊 **OK, voilà où on en est :**\n\n`
      response += `••• **COMMANDES** •••\n`
      response += `📋 **${total}** au total\n`
      response += `✅ **${terminees}** livrées (${prog}%)\n`
      response += `🔄 **${enCours}** en cours de route\n`
      response += `📝 **${brouillon}** en attente\n`
      if (urgentes > 0) response += `🔴 **${urgentes} urgentes** — celles-là méritent un coup d'œil\n`

      try {
        const items: any[] = await apiFetch('/stock/items').catch(() => [])
        const lowStock = items.filter((i: any) => i.quantity <= i.alertThreshold)
        response += `\n••• **STOCK** •••\n`
        response += `📦 **${items.length}** articles\n`
        response += lowStock.length > 0
          ? `🔴 **${lowStock.length}** articles sous seuil — faudrait commander\n`
          : `✅ Aucun souci de stock, tout va bien\n`
      } catch {}

      response += `\n💬 **Des questions ?** Je suis là. Finances, prévisions, productivité...`
      return { response, data: { total, terminees, enCours, brouillon, urgentes, prog } }
    }

    // ─── FINANCE ──────────────────────────────────────────────────────
    if (isFinancialQuery(frenchQuery) || intent.type === 'financial') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const total = orders.length
      const vm = 350000
      const ca = total * vm
      const terminees = orders.filter((o: any) => ['LIVREE', 'VALIDEE'].includes(o.status)).length
      const caR = terminees * vm
      const tx = total > 0 ? Math.round((terminees / total) * 100) : 0

      return {
        response: `💰 **Parlons argent !**\n\n` +
          `**Chiffre d'Affaires global :** ${ca.toLocaleString()} DA\n` +
          `**Déjà encaissé :** ${caR.toLocaleString()} DA (${terminees} commandes bouclées)\n` +
          `**Reste à facturer :** ${(ca - caR).toLocaleString()} DA\n\n` +
          `**Un prix moyen par commande :** ${vm.toLocaleString()} DA\n\n` +
          `${tx < 30
            ? `🟠 On n'est qu'à ${tx}% de réalisation. On peut accélérer — je suis là si tu veux qu'on analyse les freins.`
            : `✅ ${tx}% de réalisation — bonne dynamique financière !`}\n\n` +
          `💡 **Tu veux qu'on regarde les prévisions ou la productivité ?**`,
        data: { ca, caR }
      }
    }

    // ─── PRÉVISIONS ──────────────────────────────────────────────────
    if (textContains(frenchQuery, 'prévision', 'prévi', 'prédiction', 'estimation', 'tendance', 'avenir', 'prochain', 'bientôt') || intent.type === 'production') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const enCours = orders.filter((o: any) => !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length
      const terminees = orders.filter((o: any) => ['LIVREE', 'VALIDEE'].includes(o.status)).length
      const rythme = Math.max(1, Math.round((terminees || 1) / 6))
      const mois = Math.ceil(enCours / rythme)
      const dateFin = new Date(); dateFin.setMonth(dateFin.getMonth() + mois)

      return {
        response: `🔮 **Ma boule de cristal dit :**\n\n` +
          `Avec le rythme actuel (**${rythme} commandes/mois**), les **${enCours}** commandes en cours devraient être finies vers **${dateFin.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}**.\n\n` +
          `${mois <= 2 ? "✅ Ça va vite, c'est bien parti !" : mois <= 4 ? "🟡 RAS, dans les temps." : "🔵 Ça prend un peu de temps, mais rien d'anormal."}\n\n` +
          `**Tu veux qu'on analyse la productivité pour voir si on peut accélérer ?**`,
        data: { enCours, rythme, mois }
      }
    }

    // ─── PRODUCTIVITÉ ────────────────────────────────────────────────
    if (textContains(frenchQuery, 'productivité', 'productivite', 'performance', 'efficacité', 'rendement', 'bien', 'ça marche', 'ça roule')) {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const total = orders.length
      const terminees = orders.filter((o: any) => ['LIVREE', 'VALIDEE'].includes(o.status)).length
      const enCours = orders.filter((o: any) => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'ATTENTE_APPROBATION_ADMIN', 'EN_LIVRAISON'].includes(o.status)).length
      const bloquées = orders.filter((o: any) => ['BROUILLON', 'PRET_POUR_PRODUCTION'].includes(o.status)).length
      const taux = total > 0 ? Math.round((terminees / total) * 100) : 0
      let vibe = ''
      if (taux >= 70) vibe = "🔥 **T'assures grave !** La productivité est au top."
      else if (taux >= 40) vibe = "✅ **C'est pas mal du tout.** On peut encore gratter un peu."
      else if (taux >= 20) vibe = "🟠 **On peut mieux faire.** Rien de grave, mais faut mettre un coup de collier."
      else vibe = "🟢 **Ça démarre.** Normal au début, on va monter en régime."

      return {
        response: `🏆 **Productivité — le verdict :**\n\n${vibe}\n\n📊 **Chiffres :**\n- ✅ ${terminees} terminées / ${total} total\n- 🔄 ${enCours} en cours\n- ⏸️ ${bloquées} bloquées\n- 📈 **${taux}%** d'avancement\n\n${bloquées > 2 ? `⚠️ J'ai vu ${bloquées} commandes bloquées. Tu veux qu'on regarde lesquelles ?` : ''}`,
        data: { taux, terminees, enCours, bloquées }
      }
    }

    // ─── STOCK ────────────────────────────────────────────────────────
    if (isStockQuery(frenchQuery) || intent.type === 'stock') {
      const items: any[] = await apiFetch('/stock/items').catch(() => [])
      const totalItems = items.length
      const totalQty = items.reduce((s: number, i: any) => s + i.quantity, 0)
      const lowStock = items.filter((i: any) => i.quantity <= i.alertThreshold)
      const stockValue = items.reduce((s: number, i: any) => s + ((i.unitPrice || 0) * i.quantity), 0)

      let response = `📦 **Le stock en un coup d'œil :**\n\n`
      response += `- **${totalItems}** articles référencés\n`
      response += `- **${totalQty}** unités en rayon\n`
      response += `- 💰 **${stockValue.toLocaleString()} DA** de valeur totale\n\n`

      if (lowStock.length > 0) {
        response += `🔴 **${lowStock.length} articles à commander :**\n`
        lowStock.slice(0, 5).forEach((i: any) => {
          response += `   • ${i.name} : plus que **${i.quantity}** (seuil: ${i.alertThreshold})\n`
        })
        if (lowStock.length > 5) response += `   • ...et ${lowStock.length - 5} autre(s)\n`
        response += `\n💡 Tu veux que je prépare un bon de commande ?`
      } else {
        response += `✅ **Tout est bien approvisionné.** Rien à signaler !`
      }

      return { response, data: { totalItems, totalQty, lowStock: lowStock.length } }
    }

    // ─── BE ──────────────────────────────────────────────────────────
    if (isBEQuery(frenchQuery) || intent.type === 'be') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const d1 = orders.filter((o: any) => o.status === 'ATTENTE_DESSIN_TECH').length
      const d2 = orders.filter((o: any) => o.status === 'ATTENTE_DESSIN_2D').length
      const v = orders.filter((o: any) => o.status === 'ATTENTE_VERIFICATION').length
      const a = orders.filter((o: any) => o.status === 'ATTENTE_APPROBATION_ADMIN').length
      const totalT = d1 + d2 + v + a

      if (totalT === 0) return { response: `📐 **Bureau d'Études : tranquille 😎**\n\nAucune tâche en attente. Les ingénieurs sont à jour. Tu peux assigner de nouvelles commandes si tu veux.` }

      let response = `📐 **Le Bureau d'Études bosse ! (${totalT} tâches)**\n\n`
      if (d1 > 0) response += `📐 Ingé 1 (Plans) : **${d1}** commande${d1 > 1 ? 's' : ''}\n`
      if (d2 > 0) response += `✏️ Ingé 2 (Dessins 2D) : **${d2}** commande${d2 > 1 ? 's' : ''}\n`
      if (v > 0) response += `🔍 Vérificateur : **${v}** à checker\n`
      if (a > 0) response += `👑 Admin : **${a}** à approuver\n`

      const max = Math.max(d1, d2, v, a)
      const goulot = max === d1 ? 'Ingé 1' : max === d2 ? 'Ingé 2' : max === v ? 'Vérificateur' : 'Admin'
      response += `\n💡 **Le goulot :** ${goulot} — tu veux qu'on regarde ça ?`

      return { response, data: { d1, d2, v, a } }
    }

    // ─── ACTIVITÉ ────────────────────────────────────────────────────
    if (isActivityQuery(frenchQuery) || intent.type === 'activity') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const recent = orders.slice(0, 5)
      return {
        response: `📋 **Les dernières actus chez RMASC :**\n\n${recent.map((o: any) => `   • ${o.serialNumber} — ${o.clientName} (${o.status})`).join('\n')}\n\n${orders.length > 5 ? `\net ${orders.length - 5} autre${orders.length - 5 > 1 ? 's' : ''} plus anciennes` : ''}\n\n💡 Tu veux un résumé complet ?`,
        data: { count: orders.length }
      }
    }

    // ─── CLIENTS ─────────────────────────────────────────────────────
    if (isClientQuery(frenchQuery) || intent.type === 'client') {
      const orders: any[] = await apiFetch('/orders').catch(() => [])
      const clients = [...new Map(orders.map((o: any) => [o.clientName, o])).keys()]
      return {
        response: `👥 **Nos clients :**\n\n${clients.length > 0 ? clients.map((name: string) => `   • **${name}** — ${orders.filter((o: any) => o.clientName === name).length} commande${orders.filter((o: any) => o.clientName === name).length > 1 ? 's' : ''}`).join('\n') : 'Aucun client pour le moment'}\n\n${clients.length > 0 ? `📊 **${orders.length}** commandes réparties sur **${clients.length}** clients` : ''}`,
        data: { clients: clients.length }
      }
    }

    // ─── AIDE — Salim se présente ────────────────────────────────────
    if (isHelpQuery(frenchQuery) || intent.type === 'help') {
      return {
        response: `🤖 **Salim** — je suis ton assistant RMASC.\n\nJe peux causer en **français, arabe, kabyle, darja, anglais** — et je comprends même avec les fautes. Pas de stress.\n\n🎤 **Tu peux me parler au micro.**\n📸 **M'envoyer une image, je la regarde.**\n⚡ **Me demander d'agir :**\n   • "Passe RMASC-XXX en livrée"\n   • "Ajoute 10 unités au stock"\n   • "Approuve le plan de RMASC-XXX"\n   • "Crée une commande" → je te guide pas à pas\n   • "Crée une commande pour AB Lift" → je pose les questions, tu réponds, je remplis\n\n**🗣️ Dialogue guidé (nouveau !) :**\n   • Dis "Crée une commande" et je te pose toutes les questions\n   • Tu réponds étape par étape, je construis la commande\n   • À la fin, je résume et je crée sur confirmation\n\n**💰 Sujets que je maîtrise :**\n   • Résumé de production\n   • Analyse financière & CA\n   • Prévisions & tendances\n   • Productivité & performance\n   • État des stocks & alertes\n   • Bureau d'Études & tâches\n   • Clients & activités\n\n**Brèf, je suis là pour t'aider, pas pour te faire chier. 😄 Pose des questions normales.**`
      }
    }

    // ─── DÉFAUT — réponse naturelle ──────────────────────────────────
    return {
      response: `Hmm, j'ai pas tout saisi 😅 Mais c'est pas grave !\n\n**Je parle :** français, arabe (**العربية**), kabyle (**ⵜⴰⵎⴰⵣⵉⵖⵜ**), darja (**الدارجة**), anglais.\n\n💡 **Tu peux essayer :**\n   • "Résumé" — voir où on en est\n   • "Parlons finances" — le CA\n   • "Les stocks ?" — l'inventaire\n   • "Tu prévois quoi ?" — prédictions\n   • "Passe RMASC-XXX en livrée" — action !\n\n📸 Ou envoie-moi une image, je regarde.\n🎤 Parle au micro si t'as la flemme d'écrire.`
    }

  } catch (error: any) {
    return {
      response: `Oups, une erreur est arrivée 😅 **${error.message || 'le serveur a fait un caprice'}**.\n\nAttends un peu et réessaie — si ça persiste, le backend a peut-être besoin d'un redémarrage.`
    }
  }
}

// ─── React Component ───────────────────────────────────────────────────────

export default function AgentPanel({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: `👋 **Hé ! Moi c'est Salim.**\n\nJe suis ton assistant RMASC. Je parle français, arabe, kabyle, darja, anglais. Je comprends même les fautes.\n\nLaisse-moi checker la prod pour toi...`,
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [showImageInspector, setShowImageInspector] = useState(false)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)
  const [conversation, setConversation] = useState<ConversationState | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
  useEffect(() => { inputRef.current?.focus() }, [isOpen])

  // ── Auto-résumé au démarrage ──────────────────────────────────────────
  useEffect(() => {
    if (!initialized) {
      const timer = setTimeout(() => {
        setMessages(prev => [...prev, {
          id: 'm-auto-' + Date.now(),
          role: 'user',
          content: 'Résumé',
          timestamp: new Date(),
        }])
        handleSend('Résumé', true)
        setInitialized(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [initialized])

  const handleSend = async (text?: string, silent?: boolean) => {
    const message = (text || input).trim()
    if (!message || loading) return

    setPendingPermission(null)

    // ── ACTIVE CONVERSATION? Process as flow step ─────────────────────
    if (conversation?.active && !silent) {
      const lang = detectLanguage(message)
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now(),
        role: 'user', content: message, timestamp: new Date(), lang
      }])
      setInput('')
      setLoading(true)

      // Check if user is confirming a completed flow (active=false means all steps done)
      if (!conversation.active && conversation.step >= conversation.totalSteps) {
        const confirmWords = ['oui', 'yes', 'yeah', 'ok', 'd accord', 'daccord', 'confirme', 'vas y', 'go', 'أجل', 'نعم', 'eh', 'ih', 'wakha']
        const cancelWords = ['non', 'no', 'annule', 'laisse', 'attends', 'لا', 'la']
        if (confirmWords.some(w => message.toLowerCase().includes(w))) {
          setMessages(prev => [...prev, {
            id: 'm_' + Date.now() + 1,
            role: 'assistant',
            content: `⏳ **Je crée la commande...**`,
            timestamp: new Date(),
          }])
          try {
            const result = await executeOrderCreation(conversation.data)
            setConversation(null)
            setMessages(prev => [...prev, {
              id: 'm_' + Date.now() + 2,
              role: 'assistant',
              content: result,
              timestamp: new Date(),
            }])
          } catch (err: any) {
            setConversation(null)
            setMessages(prev => [...prev, {
              id: 'm_' + Date.now() + 2,
              role: 'assistant',
              content: `❌ **Erreur :** ${err.message}`,
              timestamp: new Date(),
            }])
          }
          setLoading(false)
          return
        }
        if (cancelWords.some(w => message.toLowerCase().includes(w))) {
          setConversation(null)
          setMessages(prev => [...prev, {
            id: 'm_' + Date.now() + 1,
            role: 'assistant',
            content: `✅ **OK, annulé.** Pas de commande créée. Tu me diras quand tu veux !`,
            timestamp: new Date(),
          }])
          setLoading(false)
          return
        }
      }

      // Process the next step in the conversation flow
      try {
        const result = await processFlowStep(conversation, message)
        setConversation(result.newState)
        setMessages(prev => [...prev, {
          id: 'm_' + Date.now() + 1,
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
        }])
      } catch (err: any) {
        setConversation(null)
        setMessages(prev => [...prev, {
          id: 'm_' + Date.now() + 1,
          role: 'assistant',
          content: `❌ **Oups :** ${err.message}`,
          timestamp: new Date(),
        }])
      }
      setLoading(false)
      return
    }

    // ── NORMAL MESSAGE ────────────────────────────────────────────────
    if (!silent) {
      const lang = detectLanguage(message)
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now(),
        role: 'user', content: message, timestamp: new Date(), lang
      }])
    }
    setInput('')
    setLoading(true)

    try {
      const result = await processQuery(message)

      // ── Conversation flow detected? ────────────────────────────────
      if (result.data?.startConversation) {
        const { state, firstResponse } = startFlow(result.data.flowType as any, result.data.initialData || {})
        setConversation(state)
        setMessages(prev => [...prev, {
          id: 'm_' + Date.now() + 1,
          role: 'assistant',
          content: firstResponse,
          timestamp: new Date(),
        }])
      } else {
        if (result.permission) setPendingPermission(result.permission)
        setMessages(prev => [...prev, {
          id: 'm_' + Date.now() + 1,
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          data: result.data,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now() + 2,
        role: 'assistant',
        content: 'Oups 😅 Je viens de planter. Réessaie ?',
        timestamp: new Date(),
      }])
    }
    setLoading(false)
  }

  const handlePermissionResponse = async (granted: boolean) => {
    if (!pendingPermission) return
    setPendingPermission(null)

    if (!granted) {
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now(),
        role: 'assistant',
        content: '✅ **OK, annulé.** J\'ai rien touché. Tranquille.',
        timestamp: new Date(),
      }])
      return
    }

    setLoading(true)
    try {
      const result = await pendingPermission.action()
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now(),
        role: 'assistant',
        content: `✅ **C'est fait !**\n\n${result}\n\n👍 Tu peux vérifier dans le tableau de bord.`,
        timestamp: new Date(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: 'm_' + Date.now(),
        role: 'assistant',
        content: `❌ **Oups, ça n'a pas marché :** ${err.message}\n\nEssaie de le faire manuellement depuis le menu.`,
        timestamp: new Date(),
      }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleVoiceResult = useCallback((text: string) => { if (text.trim()) handleSend(text.trim()) }, [])

  const handleImageAnalysis = async (imageData: string, fileName: string): Promise<string> => {
    return `👁️ **Image reçue :** "${fileName}"\n\n📸 C'est noté ! Tu peux uploader ce fichier comme document technique dans une commande via le Bureau d'Études.\n\n💡 **Tu veux que je le lie à une commande spécifique ?** Donne-moi le numéro de série !`
  }

  // ── Floating button ──
  if (!isOpen) {
    return (
      <>
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-2xl hover:shadow-amber-500/30 hover:scale-110 hover:rotate-12 transition-all duration-300 flex items-center justify-center animate-fade-in group"
          title="Salim — L'Assistant">
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
        </button>
        <style>{agentStyles}</style>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 hidden md:block animate-fade-in" onClick={() => { if (onClose) onClose(); setIsOpen(false) }} />
      <div className="fixed bottom-0 right-0 z-50 w-full max-w-md h-[85vh] md:h-[650px] md:bottom-6 md:right-6 md:rounded-2xl md:shadow-2xl flex flex-col bg-slate-900 border border-slate-700/50 overflow-hidden animate-slide-up shadow-2xl shadow-amber-500/5">
        <style>{agentStyles}</style>

        {/* HEADER */}
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-pulse-glow">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Salim <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              </h3>
              <p className="text-[9px] text-amber-200">🇩🇿 FR · AR · KAB · DERJA · EN 🎤📸⚡</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowImageInspector(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs" title="Envoie une image">📸</button>
            <button onClick={() => {
              setMessages([{ id: 'w-' + Date.now(), role: 'assistant', content: `👋 **Salut !** Nouvelle discussion. Pose-moi des questions ou donne-moi des ordres — je suis là pour ça.`, timestamp: new Date() }])
              setInitialized(false)
            }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs">✨</button>
            <button onClick={() => { setIsOpen(false); if (onClose) onClose() }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs">✕</button>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="flex-shrink-0 px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {QUICK_ACTIONS.map((action, i) => (
              <button key={i} onClick={() => {
                if (action.command === '__image__') { setShowImageInspector(true); return }
                handleSend(action.command)
              }} disabled={loading}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-amber-600/50 hover:border-amber-500/50 text-white text-[10px] font-medium transition-all duration-200 border border-slate-600/30 whitespace-nowrap disabled:opacity-50 active:scale-95">
                <span>{action.icon}</span><span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PERMISSION */}
        {pendingPermission && (
          <div className="flex-shrink-0 px-4 py-3 bg-amber-500/10 border-b border-amber-500/30 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-lg">{pendingPermission.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 mb-1">⚠️ T'es sûr ?</p>
                <p className="text-[11px] text-slate-300">{pendingPermission.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => handlePermissionResponse(true)}
                className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm">✅ Oui vas-y</button>
              <button onClick={() => handlePermissionResponse(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all">✕ Non, laisse</button>
            </div>
          </div>
        )}

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{ animationDelay: `${idx * 0.03}s` }}>
              {msg.role === 'system' ? (
                <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2"><p className="text-[10px] text-slate-400 text-center">{msg.content}</p></div>
              ) : (
                <div className={`max-w-[92%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-md backdrop-blur-sm'
                }`}>
                  {msg.lang && msg.lang !== 'fr' && msg.lang !== 'unknown' && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-slate-700 text-slate-400 uppercase">{msg.lang}</span>
                    </div>
                  )}
                  <p className="text-xs whitespace-pre-wrap leading-relaxed agent-response">{msg.content}</p>
                  <p className={`text-[8px] mt-1 ${msg.role === 'user' ? 'text-amber-200' : 'text-slate-500'}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span className="text-[10px] text-slate-400 ml-1">Salim réfléchit...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="flex-shrink-0 px-4 py-3 bg-slate-800 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <SpeechInput onResult={handleVoiceResult} disabled={loading} />
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Pose ta question — en français, arabe, kabyle..."
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 transition-all disabled:opacity-50" />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 hover:scale-105 active:scale-95">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-[8px] text-gray-400">🇫🇷 🇦🇪 🇩🇿 🇬🇧</span>
            <span className="text-[8px] text-gray-400">·</span>
            <span className="text-[8px] text-gray-400">🎤 Micro</span>
            <span className="text-[8px] text-gray-400">·</span>
            <span className="text-[8px] text-gray-400">📸 Image</span>
            <span className="text-[8px] text-gray-400">·</span>
            <span className="text-[8px] text-gray-400">⚡ Actions</span>
          </div>
        </div>
      </div>

      {showImageInspector && (
        <ImageInspector onClose={() => setShowImageInspector(false)} onAnalyze={handleImageAnalysis} />
      )}
    </>
  )
}

const agentStyles = `
  .agent-response strong { color: #FBBF24; font-weight: 700; }
  .agent-response em { font-style: italic; color: #94A3B8; }
  .scrollbar-thin::-webkit-scrollbar { height: 2px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); } 50% { box-shadow: 0 0 12px 2px rgba(251, 146, 60, 0.3); } }
`
