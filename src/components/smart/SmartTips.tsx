// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — SMART CONTEXTUAL TIPS
//  Affiche des astuces intelligentes selon le contexte et l'utilisation.
//  Les conseils s'adaptent à ce que l'utilisateur fait dans l'ERP.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'

interface Tip {
  id: string
  icon: string
  title: string
  message: string
  category: 'productivity' | 'smart' | 'discovery' | 'shortcut'
}

const ALL_TIPS: Tip[] = [
  { id: 't1', icon: '⌨️', title: 'Raccourci clavier', message: 'Appuyez sur ⌘K (Mac) ou Ctrl+K (Windows) pour ouvrir la recherche universelle.', category: 'shortcut' },
  { id: 't2', icon: '🤖', title: 'Assistant IA Salim', message: 'Cliquez sur 🤖 dans l\'en-tête pour poser des questions à Salim. Il analyse vos données en temps réel !', category: 'smart' },
  { id: 't3', icon: '📊', title: 'Prédictions intelligentes', message: 'Le widget Prédictions utilise l\'IA pour estimer les dates d\'achèvement de la production.', category: 'smart' },
  { id: 't4', icon: '🔔', title: 'Notifications intelligentes', message: 'Le centre de notifications analyse automatiquement les données pour vous alerter des priorités.', category: 'smart' },
  { id: 't5', icon: '📐', title: 'Bureau d\'Études', message: 'Les ingénieurs peuvent uploader des fichiers directement sur les commandes. Formats supportés : PDF, DWG, images.', category: 'discovery' },
  { id: 't6', icon: '📦', title: 'Gestion des stocks', message: 'Activez les alertes de stock bas pour être notifié automatiquement quand un article atteint son seuil critique.', category: 'productivity' },
  { id: 't7', icon: '⚡', title: 'Productivité', message: 'Le score de productivité vous donne un diagnostic instantané de l\'état de votre production.', category: 'productivity' },
  { id: 't8', icon: '📋', title: 'Suivi des commandes', message: 'Chaque commande suit un cycle de vie de 8 phases. Visualisez la progression dans la section Commandes.', category: 'discovery' },
  { id: 't9', icon: '💰', title: 'Facturation intégrée', message: 'Le module de facturation calcule automatiquement les marges et génère des devis professionnels.', category: 'discovery' },
  { id: 't10', icon: '🔮', title: 'Analyse prédictive', message: 'Demandez à Salim : "Prévisions production" pour voir les tendances et estimations.', category: 'smart' },
  { id: 't11', icon: '📱', title: 'PWA Installation', message: 'Vous pouvez installer RMASC FACTORY sur votre téléphone ou bureau comme une application native.', category: 'discovery' },
  { id: 't12', icon: '🏆', title: 'Performance', message: 'Demandez à Salim : "Analyse de productivité" pour un diagnostic complet de votre atelier.', category: 'productivity' },
]

export default function SmartTips({ dismissable = true }: { dismissable?: boolean }) {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Choisir un conseil aléatoire, différent à chaque fois
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem('rmasc_seen_tips') || '[]') as string[]
      const available = ALL_TIPS.filter(t => !seen.includes(t.id))
      const pool = available.length > 0 ? available : ALL_TIPS
      const tip = pool[Math.floor(Math.random() * pool.length)]

      // Mettre à jour les vus
      const updated = [...seen, tip.id].slice(-ALL_TIPS.length)
      localStorage.setItem('rmasc_seen_tips', JSON.stringify(updated))

      setCurrentTip(tip)
    } catch {
      setCurrentTip(ALL_TIPS[Math.floor(Math.random() * ALL_TIPS.length)])
    }
  }, [])

  // Changer de conseil toutes les 45 secondes
  const rotateTip = useCallback(() => {
    const tip = ALL_TIPS[Math.floor(Math.random() * ALL_TIPS.length)]
    setCurrentTip(tip)
  }, [])

  useEffect(() => {
    const iv = setInterval(rotateTip, 45_000)
    return () => clearInterval(iv)
  }, [rotateTip])

  if (!currentTip || dismissed) return null

  const colorMap = {
    productivity: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    smart: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    discovery: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    shortcut: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  }

  const borderMap = {
    productivity: 'border-l-emerald-400',
    smart: 'border-l-amber-400',
    discovery: 'border-l-blue-400',
    shortcut: 'border-l-violet-400',
  }

  return (
    <div className={`mb-4 border rounded-2xl border-l-4 ${colorMap[currentTip.category]} ${borderMap[currentTip.category]} backdrop-blur-xl p-4 animate-fade-in relative`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{currentTip.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-white/90">{currentTip.title}</span>
            <span className="text-[9px] font-medium text-white/40">
              {currentTip.category === 'productivity' ? 'Productivité' :
               currentTip.category === 'smart' ? 'Intelligence' :
               currentTip.category === 'shortcut' ? 'Raccourci' : 'Astuce'}
            </span>
          </div>
          <p className="text-xs text-white/60">{currentTip.message}</p>
        </div>
        {dismissable && (
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all text-xs text-white/30 hover:text-white/60"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
