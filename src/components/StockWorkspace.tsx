import { useState, useEffect, useCallback, useRef } from 'react'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch, apiPath } from '../config/api'
import { PageBackground } from './PageBackground'
import InstallPWA from './InstallPWA'
import AgentPanel from './agent/AgentPanel'
import SmartSearch from './smart/SmartSearch'

// ─── Types ─────────────────────────────────────────────────────────────────
interface StockItem {
  id: string; reference: string; name: string; description: string | null
  category: string; unit: string; quantity: number; alertThreshold: number
  unitPrice: number | null; imageUrl: string | null; location: string; supplierId: string | null
  supplier: Supplier | null; movements: StockMovement[]
  _count: { movements: number }
  createdAt: string
}

interface Supplier {
  id: string; name: string; contactName: string | null; email: string | null
  phone: string | null; address: string | null; notes: string | null
  _count?: { items: number; movements: number }
}

interface StockMovement {
  id: string; type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'TRANSFER'
  quantity: number; unitPrice: number | null; totalPrice: number | null
  itemId: string; item?: StockItem; orderId: string | null
  order?: { serialNumber: string } | null
  supplierId: string | null; supplier?: Supplier | null
  reference: string | null; notes: string | null; performedBy: string | null
  createdAt: string
}

interface StockDocument {
  id: string; documentType: string; documentNumber: string; title: string
  description: string | null; supplierId: string | null; orderId: string | null
  totalHT: number | null; totalTVA: number | null; totalTTC: number | null
  status: string; createdAt: string
  supplier?: Supplier | null; order?: { serialNumber: string; clientName: string } | null
}

interface StockStats { totalItems: number; lowStockItems: number; totalSuppliers: number; recentMovements: StockMovement[] }

// ─── API ──────────────────────────────────────────────────────────────────
async function fetchJson(path: string, opts?: RequestInit) {
  return apiFetch(path, opts)
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { onBack?: () => void; session?: PortalSession }

// ─── Tab config ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
  { id: 'items', icon: '📦', label: 'Articles' },
  { id: 'bon-commande', icon: '📝', label: 'Bon de Commande' },
  { id: 'suppliers', icon: '🏢', label: 'Fournisseurs' },
  { id: 'movements', icon: '📋', label: 'Mouvements' },
  { id: 'documents', icon: '📄', label: 'Documents' },
  { id: 'orders', icon: '📋', label: 'Commandes' },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
function movementLabel(t: string) { return { ENTRY: '📥 Entrée', EXIT: '📤 Sortie', ADJUSTMENT: '🔧 Ajustement', TRANSFER: '🔄 Transfert' }[t] || t }
function docTypeLabel(t: string) { return { BON_COMMANDE: '📝 Bon de Commande', BON_LIVRAISON: '📦 Bon de Livraison', FACTURE: '🧾 Facture', BON_SORTIE: '📤 Bon de Sortie', INVENTAIRE: '📋 Inventaire' }[t] || t }
function docStatusBadge(s: string) {
  const colors: Record<string, string> = { BROUILLON: 'bg-white/10 text-white', EN_ATTENTE: 'bg-amber-500/15 text-amber-400', VALIDE: 'bg-emerald-500/15 text-emerald-400', ANNULE: 'bg-red-500/15 text-red-400' }
  return colors[s] || 'bg-white/10 text-white'
}
// PdfLink disabled: PDF generation endpoint not yet implemented on the backend.
// Shows a placeholder badge until the feature is built.
function PdfLink({ _mType, _mId }: { _mType: string; _mId: string }) {
  return <span className="text-white/60 text-[10px] font-medium italic">PDF — Bientôt</span>
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function StockWorkspace({ onBack, session }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [stats, setStats] = useState<StockStats | null>(null)
  const [items, setItems] = useState<StockItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [documents, setDocuments] = useState<StockDocument[]>([])
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSmartSearch(p => !p) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); setShowAgent(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const [showDocView, setShowDocView] = useState<StockDocument | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [s, i, sup, m, d] = await Promise.all([
        fetchJson('/stock/stats').catch(() => null),
        fetchJson('/stock/items').catch(() => []),
        fetchJson('/stock/suppliers').catch(() => []),
        fetchJson('/stock/movements').catch(() => []),
        fetchJson('/stock/documents').catch(() => []),
      ])
      if (s) setStats(s)
      if (Array.isArray(i)) setItems(i)
      if (Array.isArray(sup)) setSuppliers(sup)
      if (Array.isArray(m)) setMovements(m)
      if (Array.isArray(d)) setDocuments(d)
    } catch (err: any) { console.error('[STOCK] load failed:', err.message) }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  // ── Auto-refresh: every 8s + on window focus + visibility change ───────
  useEffect(() => {
    const iv = setInterval(loadData, 8_000)
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadData() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadData])

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const showFeedback = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000)
  }

  const lowStockItems = items.filter(i => i.quantity <= i.alertThreshold)

  // ── Render tabs ─────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab stats={stats} lowStockItems={lowStockItems} movements={movements} items={items} suppliers={suppliers} onViewItem={(id) => { const i = items.find(x => x.id === id); if (i) { setSelectedItem(i); setActiveTab('items') } }} onRefresh={loadData} />
      case 'items': return <ItemsTab items={items} lowStockItems={lowStockItems} selectedItem={selectedItem} setSelectedItem={setSelectedItem} showForm={showItemForm} setShowForm={setShowItemForm} suppliers={suppliers} onRefresh={loadData} feedback={showFeedback} />
      case 'bon-commande': return <BonCommandeTab items={items} suppliers={suppliers} onRefresh={loadData} feedback={showFeedback} session={session} />
      case 'suppliers': return <SuppliersTab suppliers={suppliers} showForm={showSupplierForm} setShowForm={setShowSupplierForm} onRefresh={loadData} feedback={showFeedback} session={session} />
      case 'movements': return <MovementsTab movements={movements} showForm={showMovementForm} setShowForm={setShowMovementForm} items={items} suppliers={suppliers} onRefresh={loadData} feedback={showFeedback} session={session} />
      case 'documents': return <DocumentsTab documents={documents} showForm={showDocForm} setShowForm={setShowDocForm} suppliers={suppliers} showView={showDocView} setShowView={setShowDocView} onRefresh={loadData} feedback={showFeedback} />
      case 'orders': return <OrdersArchiveTab />
    }
  }

  return (
    <PageBackground className="h-full flex flex-col">
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white/[0.04] border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/[0.06] text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">📦</span></div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Gestion des Stocks</h1>
            <p className="text-[11px] text-white font-semibold">Suivi des articles, fournisseurs et mouvements</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Agent IA Button */}
          <button onClick={() => setShowAgent(p => !p)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${showAgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-white'}`}
            title="Assistant IA Salim (⌘I)">
            <span className="text-base">🤖</span>
          </button>
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-400">{lowStockItems.length} alerte{lowStockItems.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {session && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-white">{session.name}</span>
            </div>
          )}
          <button onClick={loadData} className="p-2 rounded-xl hover:bg-white/[0.06] text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 bg-white/[0.04] border-b border-white/10 px-6 flex gap-0">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const alertCount = tab.id === 'items' ? lowStockItems.length : tab.id === 'dashboard' ? lowStockItems.length : 0
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-base font-bold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-amber-400 text-white bg-amber-500/10' : 'border-transparent text-white/60 hover:text-white'}`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {alertCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-red-400/20 text-red-300">{alertCount}</span>}
            </button>
          )
        })}
      </div>

      {/* ── Feedback toast ── */}
      {feedback && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'}`}>
          <span>{feedback.ok ? '✅' : '⚠️'}</span> {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
      <InstallPWA variant="compact" />
      {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
      {showSmartSearch && <SmartSearch onNavigate={(view) => { setShowSmartSearch(false) }} />}
    </PageBackground>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ═════════════════════════════════════════════════════════════════════════════

function DashboardTab({ stats, lowStockItems, movements, items, suppliers, onViewItem, onRefresh }: {
  stats: StockStats | null; lowStockItems: StockItem[]; movements: StockMovement[]
  items: StockItem[]; suppliers: Supplier[]; onViewItem: (id: string) => void; onRefresh: () => void
}) {
  const totalValue = items.reduce((sum, i) => sum + ((i.unitPrice || 0) * i.quantity), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white">Articles en stock</p>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.totalItems || 0}</p>
          <p className="text-[11px] text-white/60 mt-1">
            {items.reduce((s, i) => s + i.quantity, 0)} unités totales
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white">Alertes stock</p>
            <span className="text-lg">🔴</span>
          </div>
          <p className={`text-3xl font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-white'}`}>
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-white/60 mt-1">Articles sous seuil critique</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white">Fournisseurs</p>
            <span className="text-lg">🏢</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.totalSuppliers || 0}</p>
          <p className="text-[11px] text-white/60 mt-1">Partenaires enregistrés</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white">Valeur du stock</p>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalValue.toLocaleString()} DA</p>
          <p className="text-[11px] text-white/60 mt-1">Valeur totale estimée</p>
        </div>
      </div>

      {/* Alerts + Recent Movements */}
      <div className="grid grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">🔴 Alertes Stock</h3>
            <span className="text-xs text-white">{lowStockItems.length} article{lowStockItems.length > 1 ? 's' : ''}</span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span>✅</span>
              <p className="text-sm text-emerald-400 font-medium">Tous les articles sont bien approvisionnés.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.slice(0, 8).map(item => (
                <button key={item.id} onClick={() => onViewItem(item.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">📦</span>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-white">{item.reference}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-red-600">{item.quantity} / {item.alertThreshold}</p>
                    <p className="text-[10px] text-red-400">Seuil: {item.alertThreshold}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📋 Mouvements Récents</h3>
            <span className="text-xs text-white">{movements.length} total</span>
          </div>
          {movements.length === 0 ? (
            <p className="text-sm text-white italic text-center py-4">Aucun mouvement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {movements.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{m.type === 'ENTRY' ? '📥' : m.type === 'EXIT' ? '📤' : '🔧'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{m.item?.name || 'Article'}</p>
                      <p className="text-[10px] text-white">{formatDate(m.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-bold ${m.type === 'ENTRY' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.type === 'ENTRY' ? '+' : '-'}{m.quantity}
                    </p>
                    <p className="text-[10px] text-white">{movementLabel(m.type)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock locations breakdown */}
      <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4">📍 Répartition par Stock</h3>
        <div className="grid grid-cols-2 gap-3">
          {['Stock 1', 'Stock 2'].map(loc => {
            const locItems = items.filter(i => i.location === loc)
            const total = locItems.reduce((s, i) => s + i.quantity, 0)
            const alerts = locItems.filter(i => i.quantity <= i.alertThreshold).length
            return (
              <div key={loc} className={`rounded-xl border px-4 py-3 ${loc === 'Stock 2' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                <p className="text-xs font-bold text-white">{loc}</p>
                <p className="text-lg font-bold text-white">{total}</p>
                <p className="text-[10px] text-white">{locItems.length} articles</p>
                {alerts > 0 && <p className="text-[10px] text-red-500 font-semibold mt-1">🔴 {alerts} alerte{alerts > 1 ? 's' : ''}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Categories breakdown */}
      <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4">📊 Répartition par Catégorie</h3>
        <div className="grid grid-cols-3 gap-3">
          {Array.from(new Set(items.map(i => i.category))).map(cat => {
            const catItems = items.filter(i => i.category === cat)
            const total = catItems.reduce((s, i) => s + i.quantity, 0)
            return (
              <div key={cat} className="bg-white/[0.04] rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">{cat}</p>
                <p className="text-lg font-bold text-cyan-600">{total}</p>
                <p className="text-[10px] text-white">{catItems.length} article{catItems.length > 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  BON DE COMMANDE TAB
// ═════════════════════════════════════════════════════════════════════════════

function BonCommandeTab({ items, suppliers, onRefresh, feedback, session }: {
  items: StockItem[]; suppliers: Supplier[]; onRefresh: () => void
  feedback: (ok: boolean, msg: string) => void; session?: PortalSession
}) {
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [selectedLines, setSelectedLines] = useState<{ item: StockItem; qty: number }[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<{ docNumber: string; pdfUrl: string } | null>(null)

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (filterLocation && i.location !== filterLocation) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.reference.toLowerCase().includes(search.toLowerCase())) return false
    // Don't show items already selected
    return true
  })

  const addLine = (item: StockItem) => {
    if (selectedLines.some(l => l.item.id === item.id)) return
    setSelectedLines([...selectedLines, { item, qty: 1 }])
  }

  const removeLine = (itemId: string) => {
    setSelectedLines(selectedLines.filter(l => l.item.id !== itemId))
  }

  const updateQty = (itemId: string, qty: number) => {
    setSelectedLines(selectedLines.map(l => l.item.id === itemId ? { ...l, qty: Math.max(1, qty) } : l))
  }

  const totalHT = selectedLines.reduce((s, l) => s + (l.item.unitPrice || 0) * l.qty, 0)
  const totalTTC = totalHT

  const resetForm = () => {
    setSelectedLines([])
    setSupplierId('')
    setTitle('')
    setDescription('')
    setGeneratedDoc(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedLines.length === 0) { feedback(false, '⚠️ Ajoutez au moins un article.'); return }
    setSaving(true)
    try {
      const docNumber = `BC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
      const result = await fetchJson('/stock/bon-commande', {
        method: 'POST',
        body: JSON.stringify({
          documentNumber: docNumber,
          title: title || `Commande ${new Date().toLocaleDateString('fr-FR')}`,
          description: description || undefined,
          supplierId: supplierId || undefined,
          totalHT,
          totalTTC,
          lines: selectedLines.map(l => ({
            itemId: l.item.id,
            quantity: l.qty,
            unitPrice: l.item.unitPrice || 0,
            totalPrice: (l.item.unitPrice || 0) * l.qty,
          })),
          createdBy: session?.name || 'Magasinier',
        }),
      })
      const pdfUrl = `/documents/stock/bon_commande_${docNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      setGeneratedDoc({ docNumber, pdfUrl })
      feedback(true, `✅ Bon de commande ${docNumber} créé avec succès ! PDF généré.`)
      onRefresh()
    } catch (err: any) { feedback(false, err.message) }
    finally { setSaving(false) }
  }

  // Success view
  if (generatedDoc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Bon de Commande Créé</h2>
        <p className="text-sm text-white mb-2">N° <span className="font-mono font-bold text-white">{generatedDoc.docNumber}</span></p>
        <a href={apiPath(generatedDoc.pdfUrl)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 transition-all shadow-sm mb-4">
          📄 Télécharger le PDF
        </a>
        <div>
          <button onClick={resetForm} className="px-4 py-2 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.04] transition-all">
            ➕ Nouveau bon de commande
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">📝 Nouveau Bon de Commande</h2>
        <span className="text-xs text-white">{selectedLines.length} article{selectedLines.length > 1 ? 's' : ''} sélectionné{selectedLines.length > 1 ? 's' : ''}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier & Info */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Fournisseur" value={supplierId} onChange={setSupplierId}
              options={[{ value: '', label: '— Sélectionner —' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
            <InputField label="Titre du bon" value={title} onChange={setTitle} placeholder="Ex: Achat tôle acier avril" />
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-white">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full mt-1 px-3.5 py-2 rounded-xl border border-white/10 text-sm focus:ring-2 focus:ring-cyan-200" placeholder="Notes ou instructions..." />
          </div>
        </div>

        {/* Search Items */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
          <p className="text-xs font-semibold text-white mb-3">🔍 Rechercher des articles à commander</p>
          <div className="flex items-center gap-3 mb-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou référence..." className="h-9 flex-1 px-3.5 rounded-xl border border-white/10 text-xs focus:ring-2 focus:ring-cyan-200" />
            <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="h-9 px-3 rounded-xl border border-white/10 text-xs"><option value="">Tous stocks</option><option value="Stock 1">Stock 1</option><option value="Stock 2">Stock 2</option></select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-9 px-3 rounded-xl border border-white/10 text-xs"><option value="">Toutes catégories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>

          {/* Search results grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="col-span-full text-xs text-white italic text-center py-4">Aucun article trouvé.</p>}
            {filtered.slice(0, 30).map(item => {
              const alreadySelected = selectedLines.some(l => l.item.id === item.id)
              return (
                <button key={item.id} type="button" onClick={() => !alreadySelected && addLine(item)}
                  disabled={alreadySelected}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${alreadySelected ? 'bg-white/[0.04] border-white/10 opacity-50 cursor-not-allowed' : 'border-white/10 hover:border-cyan-400 hover:bg-cyan-500/10'}`}>
                  <p className="font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-white font-mono">{item.reference}</p>
                  <p className="text-[10px] text-white">
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${item.location === 'Stock 2' ? 'bg-violet-500/20 text-violet-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{item.location}</span>
                    {' · '}{item.quantity} en stock · {item.unitPrice?.toLocaleString() || '—'} DA
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Items */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 shadow-sm">
          <p className="text-xs font-semibold text-white mb-3">📋 Articles sélectionnés ({selectedLines.length})</p>
          {selectedLines.length === 0 ? (
            <p className="text-xs text-white italic">Recherchez et cliquez sur des articles pour les ajouter.</p>
          ) : (
            <div className="space-y-2">
              {selectedLines.map(line => (
                <div key={line.item.id} className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{line.item.name}</p>
                    <p className="text-[10px] text-white font-mono">{line.item.reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white">Qté:</span>
                    <input type="number" min="1" value={line.qty}
                      onChange={e => updateQty(line.item.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 px-2 rounded-lg border border-white/10 text-xs text-center font-semibold" />
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs font-bold text-white">{((line.item.unitPrice || 0) * line.qty).toLocaleString()} DA</p>
                    <p className="text-[9px] text-white">{line.item.unitPrice?.toLocaleString() || '0'} DA/unité</p>
                  </div>
                  <button type="button" onClick={() => removeLine(line.item.id)} className="text-red-400 hover:text-red-600 text-sm font-bold px-1">✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                <p className="text-xs text-white">Total HT estimé</p>
                <p className="text-sm font-bold text-white">{totalHT.toLocaleString()} DA</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || selectedLines.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold hover:from-cyan-400 hover:to-teal-500 transition-all shadow-sm disabled:opacity-60 flex items-center gap-2">
            {saving ? '⏳...' : '📄 Générer le Bon de Commande'}
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.04]">Réinitialiser</button>
        </div>
      </form>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  ITEMS TAB
// ═════════════════════════════════════════════════════════════════════════════

const CATEGORIES = ['Tôlerie & Métal', 'Composants Électriques', 'Hydraulique', 'Fixations & Quincaillerie', 'Vitrerie', 'Bois & Finitions', 'Conditionnement', 'Autre']

function ItemsTab({ items, lowStockItems, selectedItem, setSelectedItem, showForm, setShowForm, suppliers, onRefresh, feedback }: {
  items: StockItem[]; lowStockItems: StockItem[]
  selectedItem: StockItem | null; setSelectedItem: (i: StockItem | null) => void
  showForm: boolean; setShowForm: (s: boolean) => void
  suppliers: Supplier[]; onRefresh: () => void; feedback: (ok: boolean, msg: string) => void
}) {
  const [filterCat, setFilterCat] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ reference: '', name: '', description: '', category: 'Tôlerie & Métal', unit: 'Unité', location: 'Stock 1', quantity: 0, alertThreshold: 5, unitPrice: 0, supplierId: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (filterLocation && i.location !== filterLocation) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.reference.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const item = await fetchJson('/stock/items', { method: 'POST', body: JSON.stringify(form) })
      // Upload image if selected
      if (imageFile && item?.id) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const dataUrl = reader.result as string
            resolve(dataUrl.split(',')[1]) // strip data:image/... prefix
          }
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
        await fetchJson(`/stock/items/${item.id}/image`, {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type }),
        })
      }
      feedback(true, `✅ Article "${form.name}" créé avec succès.`)
      setShowForm(false)
      setForm({ reference: '', name: '', description: '', category: 'Tôlerie & Métal', unit: 'Unité', location: 'Stock 1', quantity: 0, alertThreshold: 5, unitPrice: 0, supplierId: '' })
      setImageFile(null); setImagePreview(null)
      onRefresh()
    } catch (err: any) { feedback(false, err.message) }
    finally { setSaving(false) }
  }

  if (selectedItem) return <ItemDetailView item={selectedItem} onBack={() => { setSelectedItem(null); onRefresh() }} feedback={feedback} />
  if (showForm) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        <h2 className="text-lg font-bold text-white">📦 Nouvel Article</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Référence *" value={form.reference} onChange={v => setForm({ ...form, reference: v })} required />
          <InputField label="Nom *" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Catégorie" value={form.category} onChange={v => setForm({ ...form, category: v })} options={CATEGORIES} />
          <SelectField label="Unité" value={form.unit} onChange={v => setForm({ ...form, unit: v })} options={['Unité', 'Mètre', 'Kg', 'Lot', 'Plaque', 'Rouleau', 'Boîte']} />
          <SelectField label="Stock" value={form.location} onChange={v => setForm({ ...form, location: v })} options={['Stock 1', 'Stock 2']} />
        </div>
        <div>
          <label className="text-xs font-semibold text-white">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 px-3.5 py-2 rounded-xl border border-white/10 text-sm focus:ring-2 focus:ring-cyan-200" placeholder="Description optionnelle..." />
        </div>
        {/* Image upload */}
        <div>
          <label className="text-xs font-semibold text-white mb-1 block">Photo du produit</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.04] cursor-pointer hover:bg-white/[0.06] transition-all text-sm text-white hover:text-white">
              <span>📷</span>
              <span>{imageFile ? imageFile.name : 'Ajouter une photo'}</span>
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
            {imagePreview && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">✕</button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <InputField label="Quantité initiale" value={String(form.quantity)} onChange={v => setForm({ ...form, quantity: parseInt(v) || 0 })} type="number" />
          <InputField label="Seuil d'alerte" value={String(form.alertThreshold)} onChange={v => setForm({ ...form, alertThreshold: parseInt(v) || 5 })} type="number" />
          <InputField label="Prix unitaire (DA)" value={String(form.unitPrice)} onChange={v => setForm({ ...form, unitPrice: parseFloat(v) || 0 })} type="number" />
        </div>
        <SelectField label="Fournisseur" value={form.supplierId} onChange={v => setForm({ ...form, supplierId: v })} options={[{ value: '', label: 'Aucun' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold hover:from-cyan-400 hover:to-teal-500 transition-all shadow-sm disabled:opacity-60">{saving ? '⏳...' : '💾 Créer l\'article'}</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.04]">Annuler</button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">📦 Articles en Stock</h2>
          <span className="text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">{items.length} articles</span>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-teal-500 transition-all shadow-sm">➕ Nouvel article</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." className="h-9 px-3.5 rounded-xl border border-white/10 text-xs focus:ring-2 focus:ring-cyan-200 w-56" />
        <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="h-9 px-3 rounded-xl border border-white/10 text-xs"><option value="">Tous les stocks</option><option value="Stock 1">Stock 1</option><option value="Stock 2">Stock 2</option></select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-9 px-3 rounded-xl border border-white/10 text-xs"><option value="">Toutes catégories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(item => {
          const isLow = item.quantity <= item.alertThreshold
          return (
            <button key={item.id} onClick={() => setSelectedItem(item)}
              className={`text-left bg-white/[0.04] rounded-xl border-2 p-4 transition-all hover:shadow-md ${isLow ? 'border-red-200 hover:border-red-400' : 'border-white/10 hover:border-cyan-300'}`}>
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={apiPath(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.location === 'Stock 2' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'}`}>{item.location}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-white font-mono">{item.reference}</p>
                      </div>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.06] text-white'}`}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white">
                    <span>{item.category}</span>
                    {item.supplier && <><span>•</span><span>{item.supplier.name}</span></>}
                  </div>
                  {isLow && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1">
                      <span>🔴</span> Stock bas — Seuil: {item.alertThreshold}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && <p className="col-span-full text-sm text-white italic text-center py-8">Aucun article trouvé.</p>}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  ITEM DETAIL VIEW
// ═════════════════════════════════════════════════════════════════════════════

function ItemDetailView({ item, onBack, feedback }: { item: StockItem; onBack: () => void; feedback: (ok: boolean, msg: string) => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    fetchJson(`/stock/movements?itemId=${item.id}`)
      .then((data) => { if (!ignore) setMovements(data) })
      .catch(() => {})
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [item.id])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] mt-0.5"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        {item.imageUrl && (
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 shadow-sm">
            <img src={apiPath(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{item.name}</h2>
            <span className="text-xs font-mono text-white bg-white/[0.06] px-2 py-0.5 rounded">{item.reference}</span>
          </div>
          {!item.imageUrl && <p className="text-[10px] text-white mt-1">📷 Aucune photo</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4">
          <p className="text-[10px] font-bold text-white uppercase tracking-wider">Quantité</p>
          <p className={`text-2xl font-bold mt-1 ${item.quantity <= item.alertThreshold ? 'text-red-500' : 'text-emerald-600'}`}>{item.quantity} {item.unit}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4">
          <p className="text-[10px] font-bold text-white uppercase tracking-wider">Seuil d'alerte</p>
          <p className="text-2xl font-bold mt-1 text-white">{item.alertThreshold} {item.unit}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4">
          <p className="text-[10px] font-bold text-white uppercase tracking-wider">Prix unitaire</p>
          <p className="text-2xl font-bold mt-1 text-white">{item.unitPrice?.toLocaleString() || '—'} DA</p>
        </div>
      </div>

      <div className="bg-white/[0.04] rounded-xl border border-white/10 p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-white">Catégorie</span><p className="font-semibold text-white">{item.category}</p></div>
          <div><span className="text-white">Emplacement</span><p className="font-semibold text-white"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.location === 'Stock 2' ? 'bg-violet-500/20 text-violet-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{item.location}</span></p></div>
          <div><span className="text-white">Fournisseur</span><p className="font-semibold text-white">{item.supplier?.name || '—'}</p></div>
          {item.description && <div className="col-span-2"><span className="text-white">Description</span><p className="font-semibold text-white">{item.description}</p></div>}
        </div>
      </div>

      {/* Movements history */}
      <h3 className="text-sm font-bold text-white mb-3">📋 Historique des Mouvements</h3>
      <div className="bg-white/[0.04] rounded-xl border border-white/10 overflow-hidden">
        {loading ? <p className="text-sm text-white italic text-center py-6">Chargement...</p> : movements.length === 0 ? <p className="text-sm text-white italic text-center py-6">Aucun mouvement.</p> : (
          <table className="w-full text-xs">
            <thead><tr className="bg-white/[0.04] border-b border-white/10"><th className="text-left px-4 py-2.5 font-semibold text-white">Date</th><th className="text-left px-4 py-2.5 font-semibold text-white">Type</th><th className="text-right px-4 py-2.5 font-semibold text-white">Qté</th><th className="text-right px-4 py-2.5 font-semibold text-white">Prix</th><th className="text-left px-4 py-2.5 font-semibold text-white">Réf.</th><th className="text-left px-4 py-2.5 font-semibold text-white">Doc.</th><th className="text-left px-4 py-2.5 font-semibold text-white">Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-2.5 text-white">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.type === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-400' : m.type === 'EXIT' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{movementLabel(m.type)}</span></td>
                  <td className={`px-4 py-2.5 text-right font-bold ${m.type === 'ENTRY' ? 'text-emerald-600' : 'text-red-600'}`}>{m.type === 'ENTRY' ? '+' : '-'}{m.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-white">{m.totalPrice?.toLocaleString() || '—'} DA</td>
                  <td className="px-4 py-2.5 text-white">{m.reference || m.order?.serialNumber || '—'}</td>
                  <td className="px-4 py-2.5">
                    {m.id ? <PdfLink _mType={m.type} _mId={m.id} /> : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white max-w-[120px] truncate">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  SUPPLIERS TAB
// ═════════════════════════════════════════════════════════════════════════════

function SuppliersTab({ suppliers, showForm, setShowForm, onRefresh, feedback, session }: {
  suppliers: Supplier[]; showForm: boolean; setShowForm: (s: boolean) => void
  onRefresh: () => void; feedback: (ok: boolean, msg: string) => void; session?: PortalSession
}) {
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierItems, setSupplierItems] = useState<StockItem[]>([])
  const isAdmin = session?.role === 'ADMIN'

  // Load items for the selected supplier
  useEffect(() => {
    if (!selectedSupplier) return
    fetchJson(`/stock/items?supplierId=${selectedSupplier.id}`)
      .then((data) => { if (Array.isArray(data)) setSupplierItems(data) })
      .catch(() => setSupplierItems([]))
  }, [selectedSupplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await fetchJson(`/stock/suppliers/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) })
        feedback(true, '✅ Fournisseur mis à jour.')
      } else {
        await fetchJson('/stock/suppliers', { method: 'POST', body: JSON.stringify(form) })
        feedback(true, `✅ Fournisseur "${form.name}" créé.`)
      }
      setShowForm(false); setEditingId(null); setForm({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' }); onRefresh()
    } catch (err: any) { feedback(false, err.message) }
    finally { setSaving(false) }
  }

  const editSupplier = (s: Supplier) => {
    setForm({ name: s.name, contactName: s.contactName || '', email: s.email || '', phone: s.phone || '', address: s.address || '', notes: s.notes || '' })
    setEditingId(s.id); setShowForm(true)
  }

  // ── Supplier Detail View ──
  if (selectedSupplier) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setSelectedSupplier(null) }} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
          <h2 className="text-lg font-bold text-white">{selectedSupplier.name}</h2>
          {isAdmin && <button onClick={() => editSupplier(selectedSupplier)} className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold">✏️ Modifier</button>}
        </div>

        {/* Supplier info card */}
        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedSupplier.contactName && <div><span className="text-xs text-white font-semibold">Contact</span><p className="font-semibold text-white">{selectedSupplier.contactName}</p></div>}
            {selectedSupplier.email && <div><span className="text-xs text-white font-semibold">Email</span><p className="font-semibold text-white">{selectedSupplier.email}</p></div>}
            {selectedSupplier.phone && <div><span className="text-xs text-white font-semibold">Téléphone</span><p className="font-semibold text-white">{selectedSupplier.phone}</p></div>}
            {selectedSupplier.address && <div><span className="text-xs text-white font-semibold">Adresse</span><p className="font-semibold text-white">{selectedSupplier.address}</p></div>}
            {selectedSupplier.notes && <div className="col-span-2"><span className="text-xs text-white font-semibold">Notes</span><p className="font-semibold text-white">{selectedSupplier.notes}</p></div>}
          </div>
        </div>

        {/* Products supplied */}
        <h3 className="text-sm font-bold text-white mb-3">📦 Produits fournis ({supplierItems.length})</h3>
        {supplierItems.length === 0 ? (
          <div className="bg-white/[0.04] rounded-xl border border-white/10 p-6 text-center">
            <p className="text-sm text-white">Aucun article lié à ce fournisseur.</p>
            <p className="text-xs text-white mt-1">Associez des articles lors de leur création ou modification.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supplierItems.map(item => (
              <div key={item.id} className="bg-white/[0.04] rounded-xl border border-white/10 p-4 flex items-center gap-3 hover:shadow-sm transition-all">
                {item.imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={apiPath(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-white font-mono">{item.reference}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${item.location === 'Stock 2' ? 'bg-violet-500/20 text-violet-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{item.location}</span>
                    <span className="text-white">{item.category}</span>
                    <span className="text-white">· {item.quantity} en stock</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-white">{item.unitPrice?.toLocaleString() || '—'} DA</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Supplier form ──
  if (showForm) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setShowForm(false); setEditingId(null) }} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        <h2 className="text-lg font-bold text-white">{editingId ? '✏️ Modifier' : '🏢 Nouveau'} Fournisseur</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 shadow-sm space-y-4">
        <InputField label="Nom du fournisseur *" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Personne contact" value={form.contactName} onChange={v => setForm({ ...form, contactName: v })} />
          <InputField label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Téléphone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <InputField label="Adresse" value={form.address} onChange={v => setForm({ ...form, address: v })} />
        </div>
        <div><label className="text-xs font-semibold text-white">Notes / Produits proposés</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full mt-1 px-3.5 py-2 rounded-xl border border-white/10 text-sm focus:ring-2 focus:ring-cyan-200" placeholder="Ex: Fournit des tôles inox, des vérins hydrauliques, et des composants électriques..." /></div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold disabled:opacity-60">{saving ? '⏳...' : '💾 Enregistrer'}</button>
          <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-semibold">Annuler</button>
        </div>
      </form>
    </div>
  )

  // ── Supplier list ──
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">🏢 Fournisseurs</h2>
          <span className="text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">{suppliers.length} fournisseurs</span>
        </div>
        {isAdmin && <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-xs font-bold transition-all shadow-sm">➕ Ajouter un fournisseur</button>}
      </div>
      {!isAdmin && <p className="text-xs text-white mb-4 italic">Seul l'administrateur peut gérer les fournisseurs.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
        {suppliers.map(s => (
          <button key={s.id} onClick={() => setSelectedSupplier(s)}
            className="text-left bg-white/[0.04] rounded-xl border border-white/10 p-4 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-white">{s.name}</p>
                {s.contactName && <p className="text-[10px] text-white">{s.contactName}</p>}
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && <button onClick={(e) => { e.stopPropagation(); editSupplier(s) }} className="text-white hover:text-white text-xs p-1">✏️</button>}
                <span className="text-white">→</span>
              </div>
            </div>
            <div className="space-y-0.5 text-[10px] text-white">
              {s.email && <p>📧 {s.email}</p>}
              {s.phone && <p>📞 {s.phone}</p>}
              {s.address && <p>📍 {s.address}</p>}
              {s._count && (
                <p className="mt-1.5 text-[10px] font-semibold">
                  <span className="text-white">📦 {s._count.items} article{s._count.items > 1 ? 's' : ''}</span>
                  {s._count.movements > 0 && <span className="text-white ml-2">· 📋 {s._count.movements} mouvement{s._count.movements > 1 ? 's' : ''}</span>}
                </p>
              )}
            </div>
            <p className="text-[10px] text-cyan-600 mt-1.5 font-semibold">Cliquez pour voir les produits →</p>
          </button>
        ))}
        {suppliers.length === 0 && <p className="col-span-full text-sm text-white italic text-center py-8">Aucun fournisseur enregistré.</p>}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  MOVEMENTS TAB
// ═════════════════════════════════════════════════════════════════════════════

function MovementsTab({ movements, showForm, setShowForm, items, suppliers, onRefresh, feedback, session }: {
  movements: StockMovement[]; showForm: boolean; setShowForm: (s: boolean) => void
  items: StockItem[]; suppliers: Supplier[]
  onRefresh: () => void; feedback: (ok: boolean, msg: string) => void; session?: PortalSession
}) {
  const [form, setForm] = useState({ type: 'ENTRY', quantity: 1, itemId: '', orderId: '', supplierId: '', reference: '', notes: '', unitPrice: 0, performedBy: session?.name || '' })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')

  const filtered = filterType ? movements.filter(m => m.type === filterType) : movements

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        totalPrice: form.unitPrice * form.quantity,
        orderId: form.orderId || undefined,
        supplierId: form.supplierId || undefined,
      }
      await fetchJson('/stock/movements', { method: 'POST', body: JSON.stringify(payload) })
      const item = items.find(i => i.id === form.itemId)
      feedback(true, `✅ ${form.type === 'ENTRY' ? 'Entrée' : 'Sortie'} enregistrée pour "${item?.name || 'article'}"`)
      setShowForm(false)
      setForm({ type: 'ENTRY', quantity: 1, itemId: '', orderId: '', supplierId: '', reference: '', notes: '', unitPrice: 0, performedBy: session?.name || '' })
      onRefresh()
    } catch (err: any) { feedback(false, err.message) }
    finally { setSaving(false) }
  }

  if (showForm) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        <h2 className="text-lg font-bold text-white">📋 Nouveau Mouvement</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type *" value={form.type} onChange={v => setForm({ ...form, type: v })} options={[{ value: 'ENTRY', label: '📥 Entrée en stock' }, { value: 'EXIT', label: '📤 Sortie de stock' }, { value: 'ADJUSTMENT', label: '🔧 Ajustement' }]} />
          <InputField label="Quantité *" value={String(form.quantity)} onChange={v => setForm({ ...form, quantity: parseInt(v) || 0 })} type="number" />
        </div>
        <SelectField label="Article *" value={form.itemId} onChange={v => setForm({ ...form, itemId: v })} options={[{ value: '', label: 'Sélectionner...' }, ...items.map(i => ({ value: i.id, label: `${i.name} (${i.reference}) — Stock: ${i.quantity}` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Prix unitaire (DA)" value={String(form.unitPrice)} onChange={v => setForm({ ...form, unitPrice: parseFloat(v) || 0 })} type="number" />
          <InputField label="Total estimé" value={String(form.unitPrice * form.quantity)} onChange={() => {}} readOnly />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Fournisseur" value={form.supplierId} onChange={v => setForm({ ...form, supplierId: v })} options={[{ value: '', label: '—' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
          <InputField label="Référence" value={form.reference} onChange={v => setForm({ ...form, reference: v })} placeholder="N° BL, N° Facture..." />
        </div>
        <div><label className="text-xs font-semibold text-white">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full mt-1 px-3.5 py-2 rounded-xl border border-white/10 text-sm focus:ring-2 focus:ring-cyan-200" placeholder="Motif, destination production..." /></div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold disabled:opacity-60">{saving ? '⏳...' : '💾 Enregistrer le mouvement'}</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-semibold">Annuler</button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">📋 Mouvements de Stock</h2>
          <span className="text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">{movements.length} mouvements</span>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-xs font-bold transition-all shadow-sm">➕ Nouveau mouvement</button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        {['', 'ENTRY', 'EXIT', 'ADJUSTMENT'].map(t => (
          <button key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === t ? 'bg-slate-800 text-white' : 'bg-white/[0.06] text-white hover:bg-white/[0.10]'}`}
          >{t ? movementLabel(t) : '📋 Tous'}</button>
        ))}
      </div>
      <div className="bg-white/[0.04] rounded-xl border border-white/10 overflow-hidden">
        {filtered.length === 0 ? <p className="text-sm text-white italic text-center py-6">Aucun mouvement.</p> : (
          <table className="w-full text-xs">
            <thead><tr className="bg-white/[0.04] border-b border-white/10"><th className="text-left px-4 py-2.5 font-semibold text-white">Date</th><th className="text-left px-4 py-2.5 font-semibold text-white">Article</th><th className="text-left px-4 py-2.5 font-semibold text-white">Type</th><th className="text-right px-4 py-2.5 font-semibold text-white">Qté</th><th className="text-right px-4 py-2.5 font-semibold text-white">Total</th><th className="text-left px-4 py-2.5 font-semibold text-white">Réf.</th><th className="text-left px-4 py-2.5 font-semibold text-white">Par</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-2.5 text-white whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-2.5 font-semibold text-white">{m.item?.name || '—'}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.type === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-400' : m.type === 'EXIT' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{movementLabel(m.type)}</span></td>
                  <td className={`px-4 py-2.5 text-right font-bold ${m.type === 'ENTRY' ? 'text-emerald-600' : 'text-red-600'}`}>{m.type === 'ENTRY' ? '+' : '-'}{m.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-white">{m.totalPrice?.toLocaleString() || '—'} DA</td>
                  <td className="px-4 py-2.5 text-white">{m.reference || m.order?.serialNumber || '—'}</td>
                  <td className="px-4 py-2.5 text-white">{m.performedBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS TAB
// ═════════════════════════════════════════════════════════════════════════════

function DocumentsTab({ documents, showForm, setShowForm, suppliers, showView, setShowView, onRefresh, feedback }: {
  documents: StockDocument[]; showForm: boolean; setShowForm: (s: boolean) => void
  suppliers: Supplier[]; showView: StockDocument | null; setShowView: (d: StockDocument | null) => void
  onRefresh: () => void; feedback: (ok: boolean, msg: string) => void
}) {
  const [form, setForm] = useState({ documentType: 'BON_COMMANDE', documentNumber: '', title: '', description: '', supplierId: '', totalHT: 0, totalTVA: 0, totalTTC: 0 })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const filtered = filterType ? documents.filter(d => d.documentType === filterType) : documents

  function generateDocNumber(type: string) {
    const prefix = { BON_COMMANDE: 'BC', BON_LIVRAISON: 'BL', FACTURE: 'FAC', BON_SORTIE: 'BS', INVENTAIRE: 'INV' }[type] || 'DOC'
    const n = String(documents.length + 1).padStart(4, '0')
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    return `${prefix}-${date}-${n}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, totalTTC: form.totalHT + form.totalTVA, supplierId: form.supplierId || undefined }
      await fetchJson('/stock/documents', { method: 'POST', body: JSON.stringify(payload) })
      feedback(true, `✅ ${docTypeLabel(form.documentType)} "${form.documentNumber}" créé.`)
      setShowForm(false); onRefresh()
    } catch (err: any) { feedback(false, err.message) }
    finally { setSaving(false) }
  }

  if (showView) return <DocumentViewer doc={showView} onBack={() => setShowView(null)} />
  if (showForm) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        <h2 className="text-lg font-bold text-white">📄 Nouveau Document</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type *" value={form.documentType} onChange={v => { setForm({ ...form, documentType: v, documentNumber: generateDocNumber(v) }) }} options={[{ value: 'BON_COMMANDE', label: '📝 Bon de Commande' }, { value: 'BON_LIVRAISON', label: '📦 Bon de Livraison' }, { value: 'FACTURE', label: '🧾 Facture' }, { value: 'BON_SORTIE', label: '📤 Bon de Sortie' }]} />
          <InputField label="N° Document" value={form.documentNumber} onChange={v => setForm({ ...form, documentNumber: v })} required />
        </div>
        <InputField label="Titre *" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="Ex: Achat tôle inox avril 2026" required />
        <div><label className="text-xs font-semibold text-white">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 px-3.5 py-2 rounded-xl border border-white/10 text-sm focus:ring-2 focus:ring-cyan-200" /></div>
        <SelectField label="Fournisseur" value={form.supplierId} onChange={v => setForm({ ...form, supplierId: v })} options={[{ value: '', label: '—' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
        <div className="grid grid-cols-3 gap-4">
          <InputField label="Total HT (DA)" value={String(form.totalHT)} onChange={v => { const ht = parseFloat(v) || 0; setForm({ ...form, totalHT: ht, totalTTC: ht + form.totalTVA }) }} type="number" />
          <InputField label="TVA (DA)" value={String(form.totalTVA)} onChange={v => { const tva = parseFloat(v) || 0; setForm({ ...form, totalTVA: tva, totalTTC: form.totalHT + tva }) }} type="number" />
          <InputField label="Total TTC (DA)" value={String(form.totalHT + form.totalTVA)} onChange={() => {}} readOnly />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold disabled:opacity-60">{saving ? '⏳...' : '💾 Créer le document'}</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-semibold">Annuler</button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">📄 Documents</h2>
          <span className="text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">{documents.length} documents</span>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-xs font-bold transition-all shadow-sm">➕ Nouveau document</button>
      </div>
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {['', 'BON_COMMANDE', 'BON_LIVRAISON', 'FACTURE', 'BON_SORTIE', 'INVENTAIRE'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === t ? 'bg-slate-800 text-white' : 'bg-white/[0.06] text-white hover:bg-white/[0.10]'}`}
          >{t ? docTypeLabel(t) : '📄 Tous'}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(doc => (
          <button key={doc.id} onClick={() => setShowView(doc)}
            className="text-left bg-white/[0.04] rounded-xl border border-white/10 p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-white">{doc.title}</p>
                <p className="text-[10px] font-mono text-white">{doc.documentNumber}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${docStatusBadge(doc.status)}`}>{doc.status === 'VALIDE' ? '✅ Validé' : doc.status === 'EN_ATTENTE' ? '⏳ En attente' : doc.status === 'ANNULE' ? '❌ Annulé' : '📝 Brouillon'}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white">
              <span>{docTypeLabel(doc.documentType)}</span>
              {doc.supplier && <><span>•</span><span>{doc.supplier.name}</span></>}
              {doc.totalTTC && <><span>•</span><span>{doc.totalTTC.toLocaleString()} DA</span></>}
            </div>
            <p className="text-[10px] text-white mt-1">{formatDate(doc.createdAt)}</p>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-sm text-white italic text-center py-8">Aucun document.</p>}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VIEWER
// ═════════════════════════════════════════════════════════════════════════════

function DocumentViewer({ doc, onBack }: { doc: StockDocument; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
        <h2 className="text-lg font-bold text-white">{docTypeLabel(doc.documentType)}</h2>
        <span className="text-xs font-mono text-white bg-white/[0.06] px-2 py-0.5 rounded">{doc.documentNumber}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${docStatusBadge(doc.status)}`}>{doc.status}</span>
      </div>

      <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 shadow-sm print:shadow-none" id="document-print">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-xl font-bold text-white"><span className="text-cyan-600">RM</span><span className="text-orange-600">ASC</span> FACTORY</h1>
            <p className="text-[10px] text-white">Gestion des Stocks</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{docTypeLabel(doc.documentType)}</p>
            <p className="text-[10px] text-white">N° {doc.documentNumber}</p>
            <p className="text-[10px] text-white">{formatDate(doc.createdAt)}</p>
          </div>
        </div>

        <h2 className="text-base font-bold text-white mb-4">{doc.title}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-[10px] font-bold text-white uppercase">Fournisseur</p>
            <p className="font-semibold text-white">{doc.supplier?.name || '—'}</p>
            {doc.supplier?.email && <p className="text-xs text-white">{doc.supplier.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white uppercase">Statut</p>
            <p className="font-semibold text-white">{doc.status === 'VALIDE' ? '✅ Validé' : doc.status === 'EN_ATTENTE' ? '⏳ En attente' : '📝 Brouillon'}</p>
          </div>
        </div>

        {doc.description && <div className="mb-4 p-3 bg-white/[0.04] rounded-xl text-sm text-white">{doc.description}</div>}

        {/* Totaux */}
        {(doc.totalHT || doc.totalTTC) && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="ml-auto w-64 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-white">Total HT</span><span className="font-semibold">{doc.totalHT?.toLocaleString() || '0'} DA</span></div>
              <div className="flex justify-between text-sm"><span className="text-white">TVA</span><span className="font-semibold">{doc.totalTVA?.toLocaleString() || '0'} DA</span></div>
              <div className="flex justify-between text-base font-bold border-t border-white/10 pt-1"><span>Total TTC</span><span className="text-cyan-600">{doc.totalTTC?.toLocaleString() || '0'} DA</span></div>
            </div>
          </div>
        )}

        {/* Print button */}
        <div className="mt-6 pt-4 border-t border-white/10 print:hidden">
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-all">
            🖨️ Imprimer / PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  ORDERS ARCHIVE TAB — Uses shared ArchiveOrders + server file API
// ═════════════════════════════════════════════════════════════════════════════

function OrdersArchiveTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<Record<string, any[]>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: any[] = await apiFetch('/orders')
        if (!cancelled) setOrders(data)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load server files for expanded orders
  const toggleExpand = async (orderId: string) => {
    if (expanded === orderId) { setExpanded(null); return }
    setExpanded(orderId)
    if (!expandedFiles[orderId]) {
      try {
        const data = await apiFetch(`/orders/${orderId}/files`)
        setExpandedFiles(prev => ({ ...prev, [orderId]: data.files || [] }))
      } catch { setExpandedFiles(prev => ({ ...prev, [orderId]: [] })) }
    }
  }

  if (loading) return <div className="p-6 text-center text-sm text-white/60">Chargement des commandes...</div>

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-white">📋 Archive des commandes</h2>
        <p className="text-xs text-white/60 mt-0.5">Consultez les documents joints à chaque commande (stockés sur le serveur).</p>
      </div>
      <div className="space-y-3 max-w-4xl">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/60">Aucune commande trouvée.</div>
        ) : orders.map(order => {
          const isExpanded = expanded === order.id
          const files = expandedFiles[order.id] || []
          return (
            <div key={order.id} className="bg-white/[0.04] rounded-xl border border-white/5 overflow-hidden">
              <div onClick={() => toggleExpand(order.id)}
                className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
                    <p className="text-xs text-white">{order.clientName} — {order.clientCity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">{order.status}</span>
                  {files.length > 0 && <span className="text-xs text-white/60">📎 {files.length}</span>}
                  <svg className={`w-4 h-4 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-white/5 pt-3">
                  {files.length === 0 ? (
                    <p className="text-xs text-white/60 italic">Aucun fichier attaché à cette commande.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {files.map((f: any, i: number) => (
                        <a key={i} href={`/api/orders/${order.id}/files/${f._id || f.id}`} download={f.originalname}
                          className="flex items-center gap-2 text-xs text-white bg-white/[0.04] rounded-lg px-3 py-2 hover:bg-white/[0.06] transition-all cursor-pointer">
                          <span>📄</span>
                          <span className="font-medium truncate flex-1">{f.originalname}</span>
                          <span className="text-white/60">{f.uploadedBy}</span>
                          {f.uploadedAt && <span className="text-white/60">{new Date(f.uploadedAt).toLocaleDateString('fr-FR')}</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  SHARED FORM FIELDS
// ═════════════════════════════════════════════════════════════════════════════

function InputField({ label, value, onChange, type = 'text', placeholder, required, readOnly }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; readOnly?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-white">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} readOnly={readOnly}
        className={`w-full h-9 px-3.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 transition-all ${readOnly ? 'bg-white/[0.04] border-white/10 text-white cursor-not-allowed' : 'border-white/10 bg-white/[0.04] text-white'}`} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] | { value: string; label: string }[] }) {
  // Normalize to {value, label}[] regardless of input format
  const normalized: { value: string; label: string }[] = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-white">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-200">
        {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
