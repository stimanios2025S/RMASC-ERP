// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — SMART SEARCH (⌘K)
//  Recherche universelle intelligente qui comprend le langage naturel.
//  Accès : ⌘K (Mac) / Ctrl+K (Windows) ou clic sur la barre de recherche.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../../config/api'

interface SearchResult {
  id: string
  type: 'order' | 'client' | 'stock' | 'action' | 'help'
  icon: string
  title: string
  subtitle: string
  action: () => void
}

interface Props {
  onNavigate: (view: string, params?: any) => void
}

const QUICK_ACTIONS = [
  { icon: '➕', label: 'Nouvel ascenseur', action: 'add-elevator', keywords: ['nouveau', 'créer', 'ajouter', 'ascenseur', 'new'] },
  { icon: '📊', label: 'Tableau de bord', action: 'dashboard', keywords: ['accueil', 'dashboard', 'home', 'tableau'] },
  { icon: '📋', label: 'Mes commandes', action: 'commandes', keywords: ['commandes', 'orders', 'liste'] },
  { icon: '📦', label: 'Voir les stocks', action: 'dashboard', keywords: ['stock', 'inventaire', 'articles'] },
  { icon: '📐', label: "Bureau d'Études", action: 'dashboard', keywords: ['be', 'bureau', 'étude', 'ingenieur'] },
  { icon: '💰', label: 'Facturation', action: 'invoicing', keywords: ['facture', 'devis', 'facturation', 'prix'] },
  { icon: '📄', label: 'File Vault', action: 'vault', keywords: ['fichier', 'document', 'vault', 'upload'] },
  { icon: '🏭', label: 'Production', action: 'dashboard', keywords: ['production', 'atelier', 'fabrication'] },
]

export default function SmartSearch({ onNavigate }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // ── Keyboard shortcut: ⌘K / Ctrl+K ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(p => !p)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // ── Search logic ──
  useEffect(() => {
    if (!query.trim()) {
      setResults(QUICK_ACTIONS.map(a => ({
        id: `action-${a.action}`,
        type: 'action',
        icon: a.icon,
        title: a.label,
        subtitle: 'Action rapide',
        action: () => { onNavigate(a.action); setIsOpen(false) },
      })))
      setSelectedIndex(0)
      return
    }

    const q = query.toLowerCase()
    setLoading(true)

    const searchTimeout = setTimeout(async () => {
      const allResults: SearchResult[] = []

      // Actions correspondant à la recherche
      QUICK_ACTIONS.forEach(a => {
        if (a.keywords.some(k => k.includes(q)) || a.label.toLowerCase().includes(q)) {
          allResults.push({
            id: `action-${a.action}`,
            type: 'action',
            icon: a.icon,
            title: a.label,
            subtitle: 'Action rapide',
            action: () => { onNavigate(a.action); setIsOpen(false) },
          })
        }
      })

      // Recherche dans les commandes (via API)
      try {
        const orders: any[] = await apiFetch('/orders')
        orders.forEach((o: any) => {
          if (o.serialNumber.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.clientCity?.toLowerCase().includes(q)) {
            allResults.push({
              id: `order-${o.id}`,
              type: 'order',
              icon: '📋',
              title: o.serialNumber,
              subtitle: `${o.clientName} — ${o.clientCity || ''} (${o.status})`,
              action: () => { onNavigate('commandes'); setIsOpen(false) },
            })
          }
        })
      } catch {}

      // Recherche dans les stocks
      try {
        const items: any[] = await apiFetch('/stock/items')
        items.forEach((i: any) => {
          if (i.name.toLowerCase().includes(q) || i.reference.toLowerCase().includes(q)) {
            allResults.push({
              id: `stock-${i.id}`,
              type: 'stock',
              icon: '📦',
              title: i.name,
              subtitle: `${i.reference} — Stock: ${i.quantity} ${i.unit}`,
              action: () => { onNavigate('dashboard'); setIsOpen(false) },
            })
          }
        })
      } catch {}

      setResults(allResults.slice(0, 12))
      setSelectedIndex(0)
      setLoading(false)
    }, 200)

    return () => clearTimeout(searchTimeout)
  }, [query, onNavigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        results[selectedIndex].action()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={overlayRef}
        className="relative z-10 w-full max-w-2xl mx-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Recherchez des commandes, clients, articles, actions... (ex: 'commande urgent', 'stock bas')"
            className="flex-1 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none bg-transparent"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 bg-white/[0.08] px-1.5 py-0.5 rounded">⌘K</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-200 text-sm ml-1">✕</button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="px-5 py-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              <span className="text-xs text-gray-400 ml-1">Recherche intelligente...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="max-h-[400px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl block mb-2">🔍</span>
                <p className="text-sm text-gray-400">Aucun résultat pour "{query}"</p>
                <p className="text-xs text-gray-500 mt-1">Essayez un autre terme ou utilisez les actions rapides</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {results.map((result, i) => (
                  <button
                    key={result.id}
                    onClick={result.action}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      i === selectedIndex
                        ? 'bg-amber-500/15 text-gray-200'
                        : 'hover:bg-white/[0.04] text-gray-300'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      i === selectedIndex ? 'bg-amber-500/20' : 'bg-white/[0.06]'
                    }`}>{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${i === selectedIndex ? 'text-amber-400' : 'text-gray-200'}`}>
                        {result.title}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      result.type === 'order' ? 'bg-blue-500/15 text-blue-400' :
                      result.type === 'stock' ? 'bg-emerald-500/15 text-emerald-400' :
                      result.type === 'action' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-white/[0.06] text-gray-400'
                    }`}>
                      {result.type === 'order' ? 'Commande' : result.type === 'stock' ? 'Stock' : result.type === 'action' ? 'Action' : 'Aide'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Footer hints */}
            <div className="px-3 py-2.5 mt-2 border-t border-white/5">
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
                <span><kbd className="bg-white/[0.08] px-1 py-0.5 rounded text-[9px] font-mono">↑↓</kbd> Navigation</span>
                <span><kbd className="bg-white/[0.08] px-1 py-0.5 rounded text-[9px] font-mono">↵</kbd> Ouvrir</span>
                <span><kbd className="bg-white/[0.08] px-1 py-0.5 rounded text-[9px] font-mono">Esc</kbd> Fermer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
