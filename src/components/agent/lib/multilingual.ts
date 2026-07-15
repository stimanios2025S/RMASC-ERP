// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Agent Multilingual NLU Engine
//  Comprend : Français, Arabe, Kabyle (Tamazight), Derja (Algérien), Anglais
//  + Tolérance aux fautes d'orthographe et au langage naturel
// ═══════════════════════════════════════════════════════════════════════════

// ─── Normalisation ─────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Remove accents
    .replace(/[œ]/g, 'oe')
    .replace(/[-,.'"!?;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Fuzzy match (tolérance aux fautes) ────────────────────────────────────
function fuzzyMatch(word: string, patterns: string[]): boolean {
  const nw = normalize(word)
  for (const p of patterns) {
    const np = normalize(p)
    // Exact match
    if (nw === np) return true
    // Contains
    if (nw.includes(np) || np.includes(nw)) return true
    // Levenshtein distance for short words (typo tolerance)
    if (nw.length <= 8 && np.length <= 8) {
      const dist = levenshtein(nw, np)
      if (dist <= 1) return true
    }
  }
  return false
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

// ─── Token contains ANY of the patterns (supports phrases) ────────────────
export function textContains(text: string, ...patterns: string[]): boolean {
  const nt = normalize(text)
  return patterns.some(p => {
    const np = normalize(p)
    return nt.includes(np) || np.includes(nt)
  })
}

// ─── Token fuzzy matches ANY word in the query ────────────────────────────
export function queryHasWord(query: string, ...words: string[]): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  return tokens.some(t => fuzzyMatch(t, words))
}

// ─── Detect language ──────────────────────────────────────────────────────
export type DetectedLang = 'fr' | 'ar' | 'kab' | 'derja' | 'en' | 'unknown'

const ARABIC_CHARS = /[؀-ۿ]/
const TIFINAGH_CHARS = /[ⴰ-⵿]/

export function detectLanguage(text: string): DetectedLang {
  if (TIFINAGH_CHARS.test(text)) return 'kab'
  if (ARABIC_CHARS.test(text)) {
    // Derja typically has French loanwords mixed in
    const frenchWords = ['salut', 'bonjour', 'merci', 'svp', 'stp', 'oui', 'non', "d'accord", 'commande', 'client', 'stock', 'production']
    const hasFrench = frenchWords.some(w => text.toLowerCase().includes(w))
    return hasFrench ? 'derja' : 'ar'
  }
  // Check for Kabyle common words
  const kabyleWords = ['azul', 'tanemmirt', 'lekhlass', 'akka', 'ula', 'd acu', 'ma', 'kra']
  if (kabyleWords.some(w => text.toLowerCase().includes(w))) return 'kab'
  // Check for English
  const engWords = ['hello', 'hi', 'please', 'thank', 'order', 'stock', 'production', 'client', 'show', 'give', 'need', 'want']
  const frWords = ['bonjour', 'salut', 'merci', 'svp', 'stp', 'commande', 'client', 'stock', 'production', 'montre', 'donne', 'aide']
  const enScore = engWords.filter(w => text.toLowerCase().includes(w)).length
  const frScore = frWords.filter(w => text.toLowerCase().includes(w)).length
  if (enScore > frScore && enScore > 0) return 'en'
  if (frScore > 0) return 'fr'
  return 'unknown'
}

// ─── Greetings in all languages ────────────────────────────────────────────
export function isGreeting(query: string): boolean {
  return queryHasWord(query,
    'bonjour', 'salut', 'hello', 'hi', 'hey', 'azul', 'salam', 'salamo', 'bsaha',
    'marhaba', 'ahlan', 'ahlan wa sahlan', 'sbah', 'masa', 'good morning',
    'صباح', 'مساء', 'سلام', 'أهلا', 'مرحبا'
  )
}

// ─── Production keywords (multilingual) ────────────────────────────────────
export function isProductionQuery(query: string): boolean {
  return queryHasWord(query,
    'production', 'atelier', 'fabrication', 'phase', 'produire', 'fabriquer',
    'صناعة', 'إنتاج', 'ورشة', 'تصنيع',
    'prod', 'fabrik', 'sinie', 'sina3a',
    'manufacturing', 'workshop', 'assembly',
    'thadewin', 'tawwuri' // Kabyle approximations
  )
}

// ─── Stock keywords ────────────────────────────────────────────────────────
export function isStockQuery(query: string): boolean {
  return queryHasWord(query,
    'stock', 'inventaire', 'article', 'materiel', 'piece', 'magasin', 'fournisseur',
    'مخزون', 'جرد', 'قطع', 'مواد', 'مستودع',
    'makhzen', 'jerd', 'coup', 'matériel', 'matriel',
    'inventory', 'supply', 'warehouse', 'item',
    'lqach', 'aghal' // Kabyle
  )
}

// ─── Financial keywords ────────────────────────────────────────────────────
export function isFinancialQuery(query: string): boolean {
  return queryHasWord(query,
    'finance', 'argent', 'prix', 'cout', 'cout', 'facture', 'chiffre', 'affaire',
    'revenu', 'marge', 'benefice', 'paie', 'salaire', 'budget',
    'مال', 'حساب', 'فاتورة', 'سعر', 'كلفة', 'ربح', 'ميزانية',
    'flous', 'chiffre', 'facture', 'prix',
    'money', 'price', 'cost', 'invoice', 'revenue', 'profit', 'budget',
    'aferdis', 'aqerruy' // Kabyle
  )
}

// ─── Urgency keywords ──────────────────────────────────────────────────────
export function isUrgencyQuery(query: string): boolean {
  return queryHasWord(query,
    'urgent', 'urgence', 'retard', 'probleme', 'important', 'critique', 'alerte',
    'عاجل', 'طارئ', 'مشكل', 'مهم', 'خطير', 'تأخير',
    'urgent', 'retard', 'problème', 'probl', 'mochekil',
    'urgent', 'delay', 'problem', 'critical', 'alert',
    'dhab', 'munqad' // Kabyle
  )
}

// ─── BE (Bureau d'Études) keywords ─────────────────────────────────────────
export function isBEQuery(query: string): boolean {
  return queryHasWord(query,
    'bureau', 'etude', 'ingenieur', 'dessin', 'plan', 'technique', 'schema',
    'cad', 'dwg', 'verification', 'verif', 'approbation',
    'مكتب', 'دراسة', 'مهندس', 'رسم', 'مخطط', 'تقني',
    'bureau', 'ingénieur', 'dessin', 'verificateur',
    'engineering', 'drawing', 'design', 'sketch',
    'tawwurt', 'ujun' // Kabyle
  )
}

// ─── Activity keywords ─────────────────────────────────────────────────────
export function isActivityQuery(query: string): boolean {
  return queryHasWord(query,
    'activite', 'mouvement', 'recent', 'dernier', 'nouveau', 'historique',
    'نشاط', 'حركة', 'أخير', 'جديد', 'تاريخ',
    'movement', 'activité', '5ir', 'jadid',
    'activity', 'recent', 'history', 'movement', 'latest',
    'amahil', 'i3erdhan' // Kabyle
  )
}

// ─── Client keywords ───────────────────────────────────────────────────────
export function isClientQuery(query: string): boolean {
  return queryHasWord(query,
    'client', 'prospect', 'client', 'partenaire', 'commande de',
    'عميل', 'زبون', 'شريك',
    'client', 'zaboun',
    'customer', 'client', 'partner',
    'amsaɣ', 'anemdukkl' // Kabyle
  )
}

// ─── Help / capabilities ───────────────────────────────────────────────────
export function isHelpQuery(query: string): boolean {
  return queryHasWord(query,
    'aide', 'capacite', 'peux tu', 'possible', 'commandes', 'que fais tu', 'help',
    'مساعدة', 'قدرات', 'هل تستطيع', 'ماذا تفعل',
    'a3awen', 'tzemred', 'acu tga',
    'help', 'can you', 'capabilities', 'commands'
  )
}

// ─── Action verbs (user wants the agent to DO something) ───────────────────
export function wantsToModify(query: string): boolean {
  return queryHasWord(query,
    'change', 'modifie', 'ajoute', 'cree', 'supprime', 'marque', 'passe',
    'envoye', 'valide', 'approuve', 'rejete', 'mets a jour', 'update',
    'creer', 'changer', 'ajouter', 'supprimer', 'enregistre', 'confirme',
    'livré', 'livree', 'terminé', 'termine',
    // Arabic/Derja
    'غير', 'بدل', 'أضف', 'احذف', 'أنشئ', 'وافق', 'رفض', 'حذف', 'أخرج', 'سلم',
    'beddel', 'ghayer', 'rnu', 'zid', 'kkes', 'radd', 'slim', 'kamel', 'snifel', 'snifles',
    // English
    'change', 'add', 'create', 'delete', 'update', 'mark', 'send',
    'approve', 'reject', 'confirm', 'deliver', 'remove',
    // Misspellings / phonetics
    'réd', 'écri', 'noter', 'cré', 'crér', 'modif',
    // Kabyle
    'beddel', 'rnu', 'kkes', 'snifel'
  )
}

// ─── Intent detection ──────────────────────────────────────────────────────
export interface Intent {
  type: 'greeting' | 'production' | 'stock' | 'financial' | 'urgency' | 'be' | 'activity' | 'client' | 'help' | 'modify' | 'unknown'
  confidence: number
  entities: Record<string, string>
}

export function detectIntent(query: string): Intent {
  const intents: Array<{ type: Intent['type']; check: () => boolean }> = [
    { type: 'greeting', check: () => isGreeting(query) },
    { type: 'help', check: () => isHelpQuery(query) },
    { type: 'urgency', check: () => isUrgencyQuery(query) },
    { type: 'financial', check: () => isFinancialQuery(query) },
    { type: 'stock', check: () => isStockQuery(query) },
    { type: 'be', check: () => isBEQuery(query) },
    { type: 'production', check: () => isProductionQuery(query) },
    { type: 'activity', check: () => isActivityQuery(query) },
    { type: 'client', check: () => isClientQuery(query) },
    { type: 'modify', check: () => wantsToModify(query) },
  ]

  for (const intent of intents) {
    if (intent.check()) {
      return { type: intent.type, confidence: 0.9, entities: {} }
    }
  }

  return { type: 'unknown', confidence: 0.3, entities: {} }
}

// ─── Multilingual response generator ──────────────────────────────────────
export function getGreeting(lang: DetectedLang): string {
  const greetings: Record<DetectedLang, string> = {
    fr: '👋 Bonjour ! Je suis Salim, votre assistant RMASC.',
    ar: '👋 مرحبا ! أنا سليم، مساعدك في RMASC.',
    kab: '👋 Azul ! Nekk d Salim, amɛawen nnwen RMASC.',
    derja: '👋 السلام عليكم ! أنا سليم، المعاون ديالكم في RMASC.',
    en: '👋 Hello! I am Salim, your RMASC assistant.',
    unknown: '👋 Bonjour ! Je suis Salim, votre assistant RMASC.',
  }
  return greetings[lang] || greetings.fr
}

// ─── Translate query to French for processing ─────────────────────────────
// This is a simple dictionary-based approach for common terms
const TRANSLATION_MAP: Record<string, string> = {
  // English → French
  'hello': 'bonjour', 'hi': 'salut', 'order': 'commande', 'orders': 'commandes',
  'stock': 'stock', 'production': 'production', 'client': 'client',
  'show': 'montre', 'give': 'donne', 'need': 'besoin', 'want': 'veux',
  'help': 'aide', 'urgent': 'urgent', 'delay': 'retard', 'problem': 'probleme',
  'financial': 'finance', 'money': 'argent', 'price': 'prix',
  'drawing': 'dessin', 'engineer': 'ingenieur', 'plan': 'plan',
  'activity': 'activite', 'recent': 'recent', 'new': 'nouveau',
  'status': 'statut', 'create': 'creer', 'delete': 'supprimer',
  'add': 'ajouter', 'update': 'modifier', 'deliver': 'livrer',
  'approve': 'approuver', 'reject': 'rejeter', 'confirm': 'confirmer',
  // Arabic → French
  'طلبية': 'commande', 'زبون': 'client', 'مخزون': 'stock',
  'إنتاج': 'production', 'مساعدة': 'aide', 'عاجل': 'urgent',
  'حالة': 'statut', 'أضف': 'ajouter', 'احذف': 'supprimer', 'أنشئ': 'creer',
  // Derja → French
  'واش': 'quoi', 'شنو': 'quoi', 'دير': 'faire',
  // Kabyle → French
  'leqraya': 'lecture', 'lqach': 'stock', 'tawwurt': 'travail',
  'acu': 'quoi', 'ma': 'quoi',
}

export function translateToFrench(text: string): string {
  let result = text
  for (const [from, to] of Object.entries(TRANSLATION_MAP)) {
    result = result.replace(new RegExp(from, 'gi'), to)
  }
  return result
}
