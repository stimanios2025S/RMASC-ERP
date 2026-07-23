// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Invoicing & Devis with Editable Lines
//  Admin can adjust every price, quantity, marge. Auto-calculated totals.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'

interface OrderSummary {
  id: string; serialNumber: string; clientName: string; clientEmail: string | null
  clientPhone: string; clientCity: string; typeMotorisation: string
  sousTypeElectrique?: string | null; largeurGaineMm: string; profondeurGaineMm: string
  hauteurGaineMm: string; typeCabine: string; typePorte: string
  finitionPorteCabine: string; finitionInterieurCabine: string; revetementSol: string
  typeChassisArcade: string; contrepoidsPosition?: string | null; status: string; createdAt: string
}

interface EditableLine {
  id: string
  categorie: string
  designation: string
  qte: number
  prixUnitaire: number
  prixTotal: number
}

const fmt = (n: number) => n.toLocaleString('fr-DZ') + ' DZD'

const INITIAL_LINES = [
  { categorie: 'CABINE', designation: 'Cabine standard', qte: 1, prixUnitaire: 189000 },
  { categorie: 'ARCADES & SECURITE', designation: 'Châssis arcade complet', qte: 1, prixUnitaire: 131180 },
  { categorie: 'MOTORISATION', designation: 'Motorisation Gearless', qte: 1, prixUnitaire: 43000 },
  { categorie: 'PORTES', designation: 'Portes palières', qte: 1, prixUnitaire: 58000 },
  { categorie: 'FINITIONS', designation: 'Finition intérieure cabine', qte: 1, prixUnitaire: 32000 },
  { categorie: 'REVETEMENTS', designation: 'Revêtement de sol', qte: 1, prixUnitaire: 16000 },
  { categorie: "MAIN D'OEUVRE", designation: 'Découpe + Pliage + Assemblage usine', qte: 1, prixUnitaire: 30000 },
  { categorie: 'TRANSPORT & POSE', designation: 'Transport usine + Pose sur site', qte: 1, prixUnitaire: 45000 },
].map(l => ({ ...l, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), prixTotal: l.prixUnitaire * l.qte }))

function handlePrint() { window.print() }

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT — InvoicingPage
// ═══════════════════════════════════════════════════════════════════════════

interface Props { onBack: () => void }

export default function InvoicingPage({ onBack }: Props) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [marginPct, setMarginPct] = useState(30)
  const [customLines, setCustomLines] = useState<EditableLine[]>(INITIAL_LINES)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: OrderSummary[] = await apiFetch('/orders')
        if (!cancelled) { setOrders(data); if (data.length > 0) setSelectedOrderId(data[0].id) }
      } catch {}
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId])

  // ─── Update a single line item ─────────────────────────────────────
  const updateLine = useCallback((lineId: string, field: keyof EditableLine, value: number | string) => {
    setCustomLines(prev => prev.map(l => {
      if (l.id !== lineId) return l
      const updated = { ...l, [field]: value }
      if (field === 'qte' || field === 'prixUnitaire') {
        const q = field === 'qte' ? Number(value) : l.qte
        const p = field === 'prixUnitaire' ? Number(value) : l.prixUnitaire
        updated.prixTotal = Math.round(q * p)
      }
      return updated
    }))
  }, [])

  // ─── Add a new empty line ──────────────────────────────────────────
  const addLine = useCallback(() => {
    setCustomLines(prev => [...prev, {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      categorie: 'AUTRE', designation: '', qte: 1, prixUnitaire: 0, prixTotal: 0
    }])
  }, [])

  // ─── Remove a line ─────────────────────────────────────────────────
  const removeLine = useCallback((lineId: string) => {
    setCustomLines(prev => prev.filter(l => l.id !== lineId))
  }, [])

  // ─── Reset lines from selected order pricing ───────────────────────
  const resetFromOrder = useCallback(() => {
    if (!selectedOrder) return
    const chargeKg = detectChargeKg(selectedOrder.typeCabine)
    const cabinePrices = OWNER_PRICES[selectedOrder.typeCabine] || OWNER_PRICES['PASSAGER']
    const avail = Object.keys(cabinePrices).map(Number).sort((a, b) => a - b)
    const nearest = avail.reduce((p, c) => Math.abs(c - chargeKg) < Math.abs(p - chargeKg) ? c : p, avail[0])
    const pr = cabinePrices[nearest]
    if (!pr) return
    const isH = selectedOrder.typeCabine === 'CHARGES_LOURDES'
    const cabinArea = calcCabinArea(selectedOrder.largeurGaineMm, selectedOrder.profondeurGaineMm)
    const m2 = cabinArea > 1.5 ? Math.round(pr.pricePerM2 * cabinArea) : 0
    setCustomLines([
      { id: crypto.randomUUID?.() || '1', categorie: 'CABINE', designation: `Cabine ${selectedOrder.typeCabine} — ${chargeKg} KG`, qte: 1, prixUnitaire: pr.basePrice, prixTotal: pr.basePrice },
      ...(m2 ? [{ id: crypto.randomUUID?.() || '2', categorie: 'CABINE', designation: `Surface cabine ${cabinArea.toFixed(2)} m²`, qte: 1, prixUnitaire: m2, prixTotal: m2 }] : []),
      { id: crypto.randomUUID?.() || '3', categorie: 'ARCADES & SECURITE', designation: `Châssis arcade complet`, qte: 1, prixUnitaire: pr.arcadePrice, prixTotal: pr.arcadePrice },
      { id: crypto.randomUUID?.() || '4', categorie: 'MOTORISATION', designation: 'Motorisation', qte: 1, prixUnitaire: pr.motorSurcharge, prixTotal: pr.motorSurcharge },
      { id: crypto.randomUUID?.() || '5', categorie: 'PORTES', designation: 'Portes palières', qte: 1, prixUnitaire: pr.doorPrice, prixTotal: pr.doorPrice },
      { id: crypto.randomUUID?.() || '6', categorie: 'FINITIONS', designation: 'Finition intérieure', qte: 1, prixUnitaire: pr.finishPrice, prixTotal: pr.finishPrice },
      { id: crypto.randomUUID?.() || '7', categorie: 'REVETEMENTS', designation: 'Revêtement de sol', qte: 1, prixUnitaire: pr.floorPrice, prixTotal: pr.floorPrice },
      { id: crypto.randomUUID?.() || '8', categorie: "MAIN D'OEUVRE", designation: 'Découpe + Pliage + Assemblage', qte: 1, prixUnitaire: isH ? 50000 : 30000, prixTotal: isH ? 50000 : 30000 },
      { id: crypto.randomUUID?.() || '9', categorie: 'TRANSPORT & POSE', designation: 'Transport + Pose sur site', qte: 1, prixUnitaire: 45000, prixTotal: 45000 },
    ])
  }, [selectedOrder])

  // ─── Calculate totals ─────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalProduction = customLines.reduce((s, l) => s + l.prixTotal, 0)
    const transportLine = customLines.find(l => l.categorie === 'TRANSPORT & POSE')
    const transportCost = transportLine?.prixTotal || 0
    const prodWithoutTransport = totalProduction - transportCost
    const profit = Math.round(prodWithoutTransport * (marginPct / 100))
    const totalHT = prodWithoutTransport + profit + transportCost
    const tva = Math.round(totalHT * 0.19)
    const totalTTC = totalHT + tva
    return { totalProduction, prodWithoutTransport, profit, totalHT, tva, totalTTC }
  }, [customLines, marginPct])

  const groupedLines = useMemo(() => {
    const groups: { categorie: string; lines: EditableLine[]; sousTotal: number }[] = []
    const map = new Map<string, EditableLine[]>()
    for (const line of customLines) {
      const arr = map.get(line.categorie) || []
      arr.push(line); map.set(line.categorie, arr)
    }
    for (const [categorie, lines] of map) {
      groups.push({ categorie, lines, sousTotal: lines.reduce((s, l) => s + l.prixTotal, 0) })
    }
    return groups
  }, [customLines])

  const serialForDisplay = selectedOrder?.serialNumber || `RMASC-${new Date().getFullYear()}-TEMP`

  return (
    <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.03] print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-white hover:text-white transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80 font-semibold">Salim Hamoun AI — Facturation</span>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold transition-all shadow-lg shadow-amber-500/25">
            📥 Exporter / Imprimer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-950 p-6 print:p-0 print:bg-white">
        <div className="max-w-7xl mx-auto flex gap-6 print:block print:max-w-none">

          {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 space-y-5 print:hidden">
            {/* Order selector */}
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-white/5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Commande</h3>
              {loading ? <div className="text-sm text-white italic">Chargement...</div> : orders.length === 0 ? (
                <div className="text-sm text-white italic">Aucune commande</div>
              ) : (
                <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                  {orders.map(o => <option key={o.id} value={o.id}>{o.serialNumber} — {o.clientName}</option>)}
                </select>
              )}
              <button onClick={resetFromOrder} disabled={!selectedOrder}
                className="mt-3 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50 transition-all">
                🔄 Charger les prix catalogue
              </button>
            </div>

            {/* Paramètres */}
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-white/5 shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center"><span className="text-xs font-bold text-amber-400">$</span></div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Paramètres</h3>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-white/80">Marge commerciale</label>
                  <input type="number" min={0} max={100} value={marginPct}
                    onChange={e => setMarginPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-20 h-8 px-2 rounded-lg border border-white/10 text-xs text-center font-bold text-amber-400 bg-white/[0.06]" />
                </div>
                <input type="range" min={0} max={80} step={1} value={marginPct}
                  onChange={e => setMarginPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-white/[0.08] accent-amber-500 cursor-pointer" />
                <p className="text-[10px] text-white mt-1">{marginPct === 0 ? '✅ Aucune marge appliquée' : `Marge: ${marginPct}%`}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-white/80 block mb-1">Ajouter une ligne</label>
                <button onClick={addLine}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-white/10 text-white text-xs font-semibold hover:border-amber-500/30 hover:text-amber-400 transition-all">
                  + Ajouter un article
                </button>
              </div>
            </div>

            {/* Résumé rapide */}
            {selectedOrder && (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 rounded-2xl p-5 border border-amber-500/20 shadow-lg space-y-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Salim Hamoun AI</span>
                    <p className="text-[9px] text-white">{selectedOrder.typeCabine} — {detectChargeKg(selectedOrder.typeCabine)} KG</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-white">Production</span><span className="font-bold text-white">{fmt(totals.prodWithoutTransport)}</span></div>
                  <div className="flex justify-between"><span className="text-white">Marge ({marginPct}%)</span><span className="font-bold text-white">{fmt(totals.profit)}</span></div>
                  <hr className="border-white/10" />
                  <div className="flex justify-between text-sm"><span className="font-bold text-white">Total HT</span><span className="font-bold text-white">{fmt(totals.totalHT)}</span></div>
                  <div className="flex justify-between"><span className="text-white">TVA 19%</span><span className="font-bold text-white">{fmt(totals.tva)}</span></div>
                  <hr className="border-white/10" />
                  <div className="flex justify-between"><span className="text-sm font-extrabold text-amber-400">TOTAL TTC</span><span className="text-lg font-extrabold text-amber-400">{fmt(totals.totalTTC)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Facture ──────────────────────────────────────── */}
          <div className="flex-1 print:flex-none print:w-full">
            <div id="invoice-content" className="bg-slate-800/70 rounded-2xl border border-white/5 overflow-hidden shadow-lg print:rounded-none print:shadow-none print:border-0 print:bg-white">
              {!selectedOrder ? (
                <div className="flex items-center justify-center h-96 text-white text-sm">{loading ? 'Chargement...' : 'Sélectionnez une commande'}</div>
              ) : (
                <>
                  {/* HEADER */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 print:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight">
                          <span className="text-amber-400">RM</span><span className="text-orange-400">ASC</span> <span className="text-amber-400">FACTORY</span>
                        </h2>
                        <p className="text-[10px] text-white/60 tracking-widest uppercase mt-0.5">Devis d'Ingénierie & Facturation</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/60">N° Devis</p>
                        <p className="text-sm font-mono text-amber-400 font-bold">{serialForDisplay}</p>
                      </div>
                    </div>
                  </div>

                  {/* METADATA */}
                  <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <p><span className="font-medium text-white/80">Client:</span> <span className="text-white">{selectedOrder.clientName}</span></p>
                      <p><span className="font-medium text-white/80">Ville:</span> <span className="text-white">{selectedOrder.clientCity}</span></p>
                      <p><span className="font-medium text-white/80">Contact:</span> <span className="text-white">{selectedOrder.clientPhone}{selectedOrder.clientEmail ? ` | ${selectedOrder.clientEmail}` : ''}</span></p>
                    </div>
                    <div className="text-right space-y-1">
                      <p><span className="font-medium text-white/80">Type:</span> <span className="text-white">{selectedOrder.typeMotorisation}</span></p>
                      <p><span className="font-medium text-white/80">Cabine:</span> <span className="text-white">{selectedOrder.typeCabine}</span></p>
                    </div>
                  </div>

                  {/* TABLEAU DÉTAILLÉ — EDITABLE */}
                  <div className="px-8 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Articles & Équipements</h3>
                      <span className="text-[10px] text-white font-mono">{serialForDisplay}</span>
                    </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-white/10">
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[5%]">#</th>
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[12%]">Catégorie</th>
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[30%]">Désignation</th>
                          <th className="text-center pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[8%]">Qté</th>
                          <th className="text-right pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[22%]">Prix Unitaire</th>
                          <th className="text-right pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[18%]">Prix Total</th>
                          <th className="text-center pb-3 text-[10px] font-bold uppercase tracking-wider text-white w-[5%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {groupedLines.map((group, gi) => (
                          <React.Fragment key={gi}>
                            {group.lines.map((line, li) => {
                              const globalIdx = customLines.findIndex(l => l.id === line.id)
                              return (
                                <tr key={line.id} className="hover:bg-white/[0.04] transition-colors group">
                                  <td className="py-2 text-xs text-white/50 font-mono">{globalIdx + 1}</td>
                                  <td className="py-2">
                                    <input value={line.categorie} onChange={e => updateLine(line.id, 'categorie', e.target.value)}
                                      className="w-full text-[10px] font-semibold bg-white/[0.06] text-white/80 px-2 py-0.5 rounded-full border-0 focus:ring-2 focus:ring-amber-500/30 focus:bg-white/[0.08]" />
                                  </td>
                                  <td className="py-2">
                                    <input value={line.designation} onChange={e => updateLine(line.id, 'designation', e.target.value)}
                                      className="w-full text-sm font-medium text-white bg-transparent border-0 border-b border-dashed border-white/10 focus:border-amber-400 focus:outline-none focus:bg-amber-500/5 px-1 py-0.5" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={line.qte} onChange={e => updateLine(line.id, 'qte', parseInt(e.target.value) || 0)}
                                      className="w-14 text-center text-sm font-semibold text-white bg-white/[0.06] border border-white/10 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                                  </td>
                                  <td className="py-2 text-right">
                                    <input type="number" min={0} value={line.prixUnitaire} onChange={e => updateLine(line.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                      className="w-full text-right text-sm text-white/80 font-mono bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                                  </td>
                                  <td className="py-2 text-right">
                                    <span className="text-sm font-bold text-white font-mono">{fmt(line.prixTotal)}</span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <button onClick={() => removeLine(line.id)}
                                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs font-bold px-1 transition-all"
                                      title="Supprimer cette ligne">✕</button>
                                  </td>
                                </tr>
                              )
                            })}
                            {group.lines.length > 1 && (
                              <tr className="bg-white/[0.02]">
                                <td colSpan={5} className="py-2 text-right pr-4">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">Sous-total {group.categorie}</span>
                                </td>
                                <td className="py-2 text-right pr-4">
                                  <span className="text-sm font-bold text-white/80 font-mono">{fmt(group.sousTotal)}</span>
                                </td>
                                <td></td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                    </div>

                    <button onClick={addLine}
                      className="mt-4 px-4 py-2 rounded-xl border-2 border-dashed border-white/10 text-white text-xs font-semibold hover:border-amber-500/30 hover:text-amber-400 transition-all w-full">
                      + Ajouter une ligne
                    </button>
                  </div>

                  {/* TOTAL */}
                  <div className="px-8 pb-5">
                    <hr className="border-white/10 mb-3" />
                    <div className="flex justify-end">
                      <div className="w-80 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-white">Total Production</span>
                          <span className="font-bold text-white font-mono">{fmt(totals.prodWithoutTransport)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-white">Marge Commerciale</span>
                            <input type="number" min={0} max={100} value={marginPct} onChange={e => setMarginPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                              className="w-14 text-center text-xs font-bold text-amber-400 bg-white/[0.06] border border-white/10 rounded-lg px-1 py-0.5" />
                            <span className="text-xs text-white">%</span>
                          </div>
                          <span className="font-bold text-white font-mono">{fmt(totals.profit)}</span>
                        </div>
                        <hr className="border-white/10" />
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-white">TOTAL HT</span>
                          <span className="text-base font-bold text-white font-mono">{fmt(totals.totalHT)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">TVA 19%</span>
                          <span className="font-bold text-white/80 font-mono">{fmt(totals.tva)}</span>
                        </div>
                        <hr className="border-white/10 border-t-2" />
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-lg font-extrabold text-amber-400">NET À PAYER</span>
                          <span className="text-xl font-extrabold text-amber-400 font-mono">{fmt(totals.totalTTC)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="px-8 py-5 border-t border-white/5 bg-white/[0.02] print:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-[10px] text-white">
                        <p className="font-semibold text-white/80 text-xs">Notes & Conditions</p>
                        <p>• Prix modifiables par l'administrateur — calcul automatique</p>
                        <p>• Marge commerciale: {marginPct}% {marginPct === 0 ? '(Aucune marge)' : ''}</p>
                        <p>• Délai de validité: 30 jours. TVA 19% applicable.</p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 h-14 border-b border-white/10 mb-1" />
                        <p className="text-[10px] text-white">Cachet & Signature</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-white">
                      <p>RMASC FACTORY — ERP Intégré</p>
                      <p className="font-mono">SHAI-v1.5-{serialForDisplay.slice(-6)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers (unchanged from original) ────────────────────────────────────

function detectChargeKg(typeCabine: string | null | undefined): number {
  if (!typeCabine) return 630
  if (typeCabine === 'CHARGES_LOURDES') return 1200
  if (typeCabine === 'PANORAMIQUE') return 630
  if (typeCabine === 'SERVICE_LIFT') return 320
  return 630
}

function calcCabinArea(largeurGaineMm: string | null | undefined, profondeurGaineMm: string | null | undefined): number {
  const Lg = parseFloat(largeurGaineMm || '') || 0
  const Pg = parseFloat(profondeurGaineMm || '') || 0
  const Lc = Math.max(0, Lg - 230)
  const Pc = Math.max(0, Pg - 450)
  return (Lc * Pc) / 1_000_000
}

interface CabinePricing {
  basePrice: number; arcadePrice: number; pricePerM2: number; motorSurcharge: number
  doorPrice: number; finishPrice: number; floorPrice: number
}

const OWNER_PRICES: Record<string, Record<number, CabinePricing>> = {
  'PASSAGER': {
    320: { basePrice: 144000, arcadePrice: 112180, pricePerM2: 45000, motorSurcharge: 27300, doorPrice: 45000, finishPrice: 25000, floorPrice: 12000 },
    450: { basePrice: 162000, arcadePrice: 119180, pricePerM2: 48000, motorSurcharge: 35000, doorPrice: 52000, finishPrice: 28000, floorPrice: 14000 },
    630: { basePrice: 189000, arcadePrice: 131180, pricePerM2: 52000, motorSurcharge: 43000, doorPrice: 58000, finishPrice: 32000, floorPrice: 16000 },
    800: { basePrice: 225000, arcadePrice: 142180, pricePerM2: 55000, motorSurcharge: 48000, doorPrice: 65000, finishPrice: 35000, floorPrice: 18000 },
    1000: { basePrice: 270000, arcadePrice: 157180, pricePerM2: 60000, motorSurcharge: 55000, doorPrice: 72000, finishPrice: 40000, floorPrice: 20000 },
    1200: { basePrice: 310000, arcadePrice: 167180, pricePerM2: 65000, motorSurcharge: 60000, doorPrice: 80000, finishPrice: 45000, floorPrice: 22000 },
    1600: { basePrice: 380000, arcadePrice: 187180, pricePerM2: 72000, motorSurcharge: 70000, doorPrice: 95000, finishPrice: 52000, floorPrice: 26000 },
    2000: { basePrice: 445000, arcadePrice: 207180, pricePerM2: 80000, motorSurcharge: 80000, doorPrice: 110000, finishPrice: 60000, floorPrice: 30000 },
    2500: { basePrice: 520000, arcadePrice: 227180, pricePerM2: 88000, motorSurcharge: 90000, doorPrice: 130000, finishPrice: 70000, floorPrice: 35000 },
  },
  'PANORAMIQUE': {
    320: { basePrice: 195000, arcadePrice: 139450, pricePerM2: 58000, motorSurcharge: 32000, doorPrice: 68000, finishPrice: 38000, floorPrice: 15000 },
    450: { basePrice: 225000, arcadePrice: 154180, pricePerM2: 62000, motorSurcharge: 40000, doorPrice: 75000, finishPrice: 42000, floorPrice: 17000 },
    630: { basePrice: 265000, arcadePrice: 164180, pricePerM2: 68000, motorSurcharge: 48000, doorPrice: 85000, finishPrice: 48000, floorPrice: 19000 },
    800: { basePrice: 310000, arcadePrice: 177180, pricePerM2: 72000, motorSurcharge: 55000, doorPrice: 95000, finishPrice: 52000, floorPrice: 22000 },
    1000: { basePrice: 365000, arcadePrice: 197180, pricePerM2: 78000, motorSurcharge: 62000, doorPrice: 105000, finishPrice: 58000, floorPrice: 25000 },
  },
  'CHARGES_LOURDES': {
    630: { basePrice: 260000, arcadePrice: 157180, pricePerM2: 55000, motorSurcharge: 45000, doorPrice: 72000, finishPrice: 30000, floorPrice: 22000 },
    800: { basePrice: 300000, arcadePrice: 167180, pricePerM2: 60000, motorSurcharge: 52000, doorPrice: 82000, finishPrice: 35000, floorPrice: 25000 },
    1000: { basePrice: 350000, arcadePrice: 177180, pricePerM2: 65000, motorSurcharge: 58000, doorPrice: 92000, finishPrice: 40000, floorPrice: 28000 },
    1200: { basePrice: 400000, arcadePrice: 187180, pricePerM2: 70000, motorSurcharge: 65000, doorPrice: 100000, finishPrice: 45000, floorPrice: 32000 },
    1600: { basePrice: 480000, arcadePrice: 207180, pricePerM2: 78000, motorSurcharge: 75000, doorPrice: 115000, finishPrice: 52000, floorPrice: 36000 },
    2000: { basePrice: 560000, arcadePrice: 227180, pricePerM2: 86000, motorSurcharge: 85000, doorPrice: 130000, finishPrice: 60000, floorPrice: 40000 },
    2500: { basePrice: 650000, arcadePrice: 247180, pricePerM2: 95000, motorSurcharge: 95000, doorPrice: 150000, finishPrice: 70000, floorPrice: 45000 },
  },
  'SERVICE_LIFT': {
    320: { basePrice: 125000, arcadePrice: 95000, pricePerM2: 38000, motorSurcharge: 22000, doorPrice: 35000, finishPrice: 15000, floorPrice: 10000 },
    450: { basePrice: 142000, arcadePrice: 105000, pricePerM2: 42000, motorSurcharge: 28000, doorPrice: 40000, finishPrice: 18000, floorPrice: 12000 },
    630: { basePrice: 168000, arcadePrice: 115000, pricePerM2: 46000, motorSurcharge: 35000, doorPrice: 45000, finishPrice: 22000, floorPrice: 14000 },
  },
}
