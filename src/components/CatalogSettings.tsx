// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Catalog Settings (Admin Only)
//  Allows the admin to add/remove/modify materials, types, options, etc.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'
import { getCatalogCategories, type CatalogCategory, type CatalogItem, invalidateCatalogCache } from '../config/catalog'

export default function CatalogSettings() {
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const showFeedback = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const data: CatalogCategory[] = await apiFetch('/catalog')
      setCategories(data)
    } catch {
      showFeedback(false, '⚠️ Erreur de chargement du catalogue.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  const selectedCategory = categories.find(c => c.category === selectedCat)

  const handleSeed = async () => {
    try {
      await apiFetch('/catalog/seed', { method: 'POST' })
      showFeedback(true, '✅ Catalogue initialisé avec les valeurs par défaut.')
      loadCatalog()
      invalidateCatalogCache()
    } catch (e: any) {
      showFeedback(false, e.message || '⚠️ Erreur.')
    }
  }

  const handleAddItem = async () => {
    if (!selectedCat || !editValue.trim() || !editLabel.trim()) {
      showFeedback(false, '⚠️ Valeur et libellé requis.')
      return
    }
    try {
      await apiFetch(`/catalog/${selectedCat}/items`, {
        method: 'POST',
        body: JSON.stringify({ value: editValue.trim(), label: editLabel.trim(), desc: editDesc.trim() || undefined }),
      })
      showFeedback(true, '✅ Élément ajouté.')
      setEditLabel(''); setEditValue(''); setEditDesc('')
      loadCatalog()
      invalidateCatalogCache()
    } catch (e: any) {
      showFeedback(false, e.message || '⚠️ Erreur.')
    }
  }

  const handleDeleteItem = async (value: string) => {
    if (!selectedCat) return
    try {
      await apiFetch(`/catalog/${selectedCat}/items/${encodeURIComponent(value)}`, { method: 'DELETE' })
      showFeedback(true, '✅ Élément supprimé.')
      loadCatalog()
      invalidateCatalogCache()
    } catch (e: any) {
      showFeedback(false, e.message || '⚠️ Erreur.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-sm text-white/60">Chargement du catalogue...</div>
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl block mb-3">📋</span>
        <p className="text-sm text-white mb-4">Le catalogue n'est pas encore initialisé.</p>
        <button onClick={handleSeed}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/25">
          ⚡ Initialiser le catalogue par défaut
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
          feedback.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <span>{feedback.ok ? '✅' : '⚠️'}</span>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
        <p className="text-xs text-amber-300 flex items-center gap-2">
          <span>⚙️</span>
          <span>Ces réglages modifient les listes déroulantes dans le formulaire de création de commande. Les ingénieurs verront vos modifications en temps réel.</span>
        </p>
      </div>

      <div className="flex gap-6">
        {/* Category selector */}
        <div className="w-56 flex-shrink-0">
          <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Catégories</p>
          <div className="space-y-1">
            {categories.map(cat => (
              <button key={cat.category}
                onClick={() => { setSelectedCat(cat.category); setEditing(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCat === cat.category
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-white hover:text-white hover:bg-white/[0.06]'
                }`}>
                {cat.label}
                <span className="text-[10px] text-white/60 ml-1.5">({cat.items.length})</span>
              </button>
            ))}
          </div>
          <button onClick={handleSeed}
            className="mt-4 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1] transition-all border border-white/10">
            🔄 Réinitialiser
          </button>
        </div>

        {/* Items panel */}
        <div className="flex-1">
          {!selectedCat ? (
            <div className="text-center py-12 text-sm text-white/60">
              Sélectionnez une catégorie pour voir ses éléments.
            </div>
          ) : !selectedCategory ? (
            <div className="text-center py-12 text-sm text-white/60">
              Catégorie "{selectedCat}" introuvable.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">{selectedCategory.label}</h3>
                <span className="text-xs text-white/60">{selectedCategory.items.length} élément{selectedCategory.items.length > 1 ? 's' : ''}</span>
              </div>

              {/* Item list */}
              <div className="space-y-1.5 mb-5 max-h-64 overflow-y-auto pr-2">
                {selectedCategory.items
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(item => (
                    <div key={item.value}
                      className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3.5 py-2.5 border border-white/5 group hover:bg-white/[0.06] transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.label}</p>
                        {item.desc && <p className="text-[10px] text-white/60 truncate">{item.desc}</p>}
                        <p className="text-[9px] text-white font-mono">{item.value}</p>
                      </div>
                      <button onClick={() => handleDeleteItem(item.value)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all ml-2 flex-shrink-0">
                        🗑️
                      </button>
                    </div>
                  ))}
              </div>

              {/* Add new item form */}
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-white mb-3">➕ Ajouter un élément</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-medium text-white/60 block mb-1">Valeur technique *</label>
                    <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                      placeholder="Ex: NOUVEAU_MATERIAU"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-white/60 block mb-1">Libellé affiché *</label>
                    <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      placeholder="Ex: Nouveau Matériau"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium text-white/60 block mb-1">Description (optionnelle)</label>
                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      placeholder="Ex: Description du nouveau matériau"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                </div>
                <button onClick={handleAddItem} disabled={!editValue.trim() || !editLabel.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 transition-all">
                  ✅ Ajouter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
