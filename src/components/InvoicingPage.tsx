import React, { useState, useMemo, useEffect } from 'react'
import { apiFetch } from '../config/api'

// ─── Types ─────────────────────────────────────────────────────────────────
interface OrderSummary {
  id: string
  serialNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
  clientCity: string
  typeMotorisation: string
  sousTypeElectrique?: string | null
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  typeCabine: string
  typePorte: string
  finitionPorteCabine: string
  finitionInterieurCabine: string
  revetementSol: string
  typeChassisArcade: string
  contrepoidsPosition?: string | null
  status: string
  createdAt: string
}

// ════════════════════════════════════════════════════════════════════════════
//  SALIM HAMOUN AI v1.5 — OWNER'S PRICING KNOWLEDGE BASE
//  Tarifs réels basés sur la grille de prix du propriétaire RMASC Factory
//  Chaque type de cabine + charge (KG) a son propre prix unitaire
// ════════════════════════════════════════════════════════════════════════════

// ─── Grille des Prix de Base par Type de Cabine et Charge (KG) ─────────────
// Le propriétaire fixe ses prix selon :
//   1. Le type de cabine (PASSAGER, PANORAMIQUE, CHARGES_LOURDES, SERVICE_LIFT)
//   2. La charge nominale en KG (320, 450, 630, 800, 1000, 1200, 1600, 2000, 2500)
//   3. Le prix au m² de la cabine calculé depuis les dimensions gaine
//   4. Chaque composant a un coût unitaire défini

interface CabinePricing {
  basePrice: number        // Prix de base cabine seule
  arcadePrice: number      // Arcade + chassis
  pricePerM2: number       // Prix au m² de surface cabine
  motorSurcharge: number   // Supplément par type moteur
  doorPrice: number        // Prix portes palières
  finishPrice: number      // Prix finitions intérieures
  floorPrice: number       // Prix revêtement sol
}

// Matrice de prix propriétaire : [typeCabine][chargeKG] → prix
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

// ─── Mapping charge KG depuis le type de cabine ───────────────────────────
function detectChargeKg(typeCabine: string | null | undefined): number {
  if (!typeCabine) return 630
  if (typeCabine === 'CHARGES_LOURDES') return 1200
  if (typeCabine === 'PANORAMIQUE') return 630
  if (typeCabine === 'SERVICE_LIFT') return 320
  return 630 // PASSAGER → standard immeuble
}

// ─── Calcul de la surface cabine (m²) depuis les dimensions gaine ─────────
function calcCabinArea(largeurGaineMm: string | null | undefined, profondeurGaineMm: string | null | undefined): number {
  const Lg = parseFloat(largeurGaineMm || '') || 0
  const Pg = parseFloat(profondeurGaineMm || '') || 0
  // Surface cabine estimée = (Lg-230) × (Pg-450) / 1_000_000
  const Lc = Math.max(0, Lg - 230)
  const Pc = Math.max(0, Pg - 450)
  return (Lc * Pc) / 1_000_000
}

// ─── Suppléments finitions ────────────────────────────────────────────────
const FINITION_MIROIR_COST = 25000
const SOL_MARBRE_GRANIT_COST = 23000
const SOL_STRIE_COST = 12000

// ─── Invoice Line Item ────────────────────────────────────────────────────
interface InvoiceLine {
  categorie: string
  designation: string
  qte: number
  prixUnitaire: number
  prixTotal: number
}

// ─── Print utility ────────────────────────────────────────────────────────
function handlePrint() { window.print() }

const fmt = (n: number) => n.toLocaleString('fr-DZ') + ' DZD'

// ════════════════════════════════════════════════════════════════════════════
//  SALIM HAMOUN AI v1.5 — MOTEUR DE FACTURATION INTELLIGENT
//  Calcule automatiquement le devis selon la méthode du propriétaire
// ════════════════════════════════════════════════════════════════════════════

function useOwnerInvoiceEngine(order: OrderSummary | null, marginPct: number, transportPose: number) {
  return useMemo((): {
    lines: InvoiceLine[]
    totalProduction: number
    profit: number
    totalHT: number
    tva: number
    totalTTC: number
    deducationLabel: string
  } => {
    if (!order) return { lines: [], totalProduction: 0, profit: 0, totalHT: 0, tva: 0, totalTTC: 0, deducationLabel: '' }

    const lines: InvoiceLine[] = []
    const chargeKg = detectChargeKg(order.typeCabine)
    const pricing = OWNER_PRICES[order.typeCabine]?.[chargeKg]

    // Si pas de tarif exact, prendre le plus proche disponible
    const cabineTypeKey = order.typeCabine?.trim() || ''
    const cabinePrices = OWNER_PRICES[cabineTypeKey]
    if (!cabinePrices) return { lines: [], totalProduction: 0, profit: 0, totalHT: 0, tva: 0, totalTTC: 0, deducationLabel: '' }

    const availableCharges = Object.keys(cabinePrices).map(Number).sort((a, b) => a - b)
    const nearestCharge = availableCharges.length > 0
      ? availableCharges.reduce((prev, curr) => Math.abs(curr - chargeKg) < Math.abs(prev - chargeKg) ? curr : prev)
      : chargeKg
    const finalPricing = pricing || cabinePrices[nearestCharge]

    if (!finalPricing) return { lines: [], totalProduction: 0, profit: 0, totalHT: 0, tva: 0, totalTTC: 0, deducationLabel: '' }

    const isGearless = order.sousTypeElectrique === 'Sans local (Gearless)'
    const cabinArea = calcCabinArea(order.largeurGaineMm, order.profondeurGaineMm)

    // ─── 1. CABINE — Prix de base selon type + charge ─────────────────────
    lines.push({
      categorie: 'CABINE',
      designation: `Cabine ${order.typeCabine} — ${chargeKg} KG`,
      qte: 1,
      prixUnitaire: finalPricing.basePrice,
      prixTotal: finalPricing.basePrice,
    })

    // ─── 2. SURFACE CABINE — Prix au m² ──────────────────────────────────
    if (cabinArea > 1.5) {
      const m2Price = Math.round(finalPricing.pricePerM2 * cabinArea)
      lines.push({
        categorie: 'CABINE',
        designation: `Surface cabine ${cabinArea.toFixed(2)} m² × ${finalPricing.pricePerM2.toLocaleString('fr-DZ')} DZD/m²`,
        qte: 1,
        prixUnitaire: m2Price,
        prixTotal: m2Price,
      })
    }

    // ─── 3. ARCADE & SECURITE ─────────────────────────────────────────────
    lines.push({
      categorie: 'ARCADES & SECURITE',
      designation: `Châssis arcade complet + sécurités ${order.typeChassisArcade ? '(' + order.typeChassisArcade.replace(/_/g, ' ') + ')' : ''}`,
      qte: 1,
      prixUnitaire: finalPricing.arcadePrice,
      prixTotal: finalPricing.arcadePrice,
    })

    // ─── 4. MOTORISATION ────────────────────────────────────────────────
    const motorDesignation = isGearless
      ? `Motorisation Gearless — Sans local machine (${order.sousTypeElectrique || 'Gearless'})`
      : `Motorisation Gearbox — Avec local machine`
    lines.push({
      categorie: 'MOTORISATION',
      designation: motorDesignation,
      qte: 1,
      prixUnitaire: finalPricing.motorSurcharge,
      prixTotal: finalPricing.motorSurcharge,
    })

    // ─── 5. PORTES PALIERES ──────────────────────────────────────────────
    const porteLabel = order.typePorte === 'AUTOMATIQUE_CENTRALE' ? 'Centrale 2V'
      : order.typePorte === 'AUTOMATIQUE_TELESCOPIQUE' ? 'Télescopique'
      : 'Battante Manuelle'
    lines.push({
      categorie: 'PORTES',
      designation: `Portes palières ${porteLabel}`,
      qte: 1,
      prixUnitaire: finalPricing.doorPrice,
      prixTotal: finalPricing.doorPrice,
    })

    // ─── 6. FINITION INTERIEURE CABINE ───────────────────────────────────
    const finitionIntCost = order.finitionInterieurCabine === 'INOX MIROIR' || order.finitionInterieurCabine === 'INOX MIROIR ET SATINÉ'
      ? finalPricing.finishPrice + 25000
      : finalPricing.finishPrice
    lines.push({
      categorie: 'FINITIONS',
      designation: `Finition intérieure cabine — ${order.finitionInterieurCabine || 'Standard'}`,
      qte: 1,
      prixUnitaire: finitionIntCost,
      prixTotal: finitionIntCost,
    })

    // ─── 7. REVETEMENT DE SOL ────────────────────────────────────────────
    let solCost = finalPricing.floorPrice
    let solLabel = `Revêtement de sol — ${order.revetementSol || 'Standard'}`
    if (order.revetementSol === 'MARBRE NATUREL' || order.revetementSol === 'GRANIT NATUREL') {
      solCost += SOL_MARBRE_GRANIT_COST
      solLabel = 'Revêtement de sol — Pierre naturelle (supplément)'
    } else if (order.revetementSol === 'ALUMINIUM STRIÉ' || order.revetementSol === 'TÔLE STRIÉE') {
      solCost += SOL_STRIE_COST
    }
    lines.push({
      categorie: 'REVETEMENTS',
      designation: solLabel,
      qte: 1,
      prixUnitaire: solCost,
      prixTotal: solCost,
    })

    // ─── 8. MAIN D'OEUVRE ────────────────────────────────────────────────
    const laborCost = order.typeCabine === 'CHARGES_LOURDES' ? 50000 : 30000
    lines.push({
      categorie: 'MAIN D\'OEUVRE',
      designation: 'Découpe + Pliage + Assemblage usine',
      qte: 1,
      prixUnitaire: laborCost,
      prixTotal: laborCost,
    })

    // ─── 9. FRAIS DE TRANSPORT ───────────────────────────────────────────
    // (Intégré dans le total via le paramètre transportPose, mais on l'ajoute en ligne)
    lines.push({
      categorie: 'TRANSPORT & POSE',
      designation: 'Transport usine + Pose sur site',
      qte: 1,
      prixUnitaire: transportPose,
      prixTotal: transportPose,
    })

    // ─── Calcul des totaux ──────────────────────────────────────────────
    const totalProduction = lines.reduce((s, l) => s + l.prixTotal, 0) - transportPose // soustrait transport du "production"
    const profit = Math.round(totalProduction * (marginPct / 100))
    const totalHT = totalProduction + profit + transportPose
    const tva = Math.round(totalHT * 0.19) // TVA par défaut 19%
    const totalTTC = totalHT + tva

    return {
      lines,
      totalProduction,
      profit,
      totalHT,
      tva,
      totalTTC,
      deducationLabel: `${order.typeCabine} — ${chargeKg} KG — ${cabinArea.toFixed(2)} m²`,
    }
  }, [order, marginPct, transportPose])
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface Props { onBack: () => void }

export default function InvoicingPage({ onBack }: Props) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [marginPct, setMarginPct] = useState(30)
  const [transportPose, setTransportPose] = useState(45000)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: OrderSummary[] = await apiFetch('/orders')
        if (!cancelled) {
          setOrders(data)
          if (data.length > 0) setSelectedOrderId(data[0].id)
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selectedOrder = useMemo(
    () => orders.find(o => o.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  )

  const invoice = useOwnerInvoiceEngine(selectedOrder, marginPct, transportPose)

  // ─── Grouper les lignes par catégorie ─────────────────────────────────
  const groupedLines = useMemo(() => {
    const groups: { categorie: string; lines: InvoiceLine[]; sousTotal: number }[] = []
    const map = new Map<string, InvoiceLine[]>()
    for (const line of invoice.lines) {
      const arr = map.get(line.categorie) || []
      arr.push(line)
      map.set(line.categorie, arr)
    }
    for (const [categorie, lines] of map) {
      groups.push({ categorie, lines, sousTotal: lines.reduce((s, l) => s + l.prixTotal, 0) })
    }
    return groups
  }, [invoice.lines])

  const serialForDisplay = selectedOrder?.serialNumber || `RMASC-${new Date().getFullYear()}-TEMP`

  return (
    <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-surface-50 print:hidden">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour Tableau de bord
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">Salim Hamoun AI v1.5 — Facturation</span>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            📥 Exporter / Imprimer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50 p-6 print:p-0 print:bg-white">
        <div className="max-w-7xl mx-auto flex gap-6 print:block print:max-w-none">

          {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 space-y-5 print:hidden">

            <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Commande</h3>
              {loading ? (
                <div className="text-sm text-gray-400 italic">Chargement...</div>
              ) : orders.length === 0 ? (
                <div className="text-sm text-gray-400 italic">Aucune commande</div>
              ) : (
                <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-surface-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all">
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>{o.serialNumber} — {o.clientName}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-500">$</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Paramètres</h3>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Marge</label>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{marginPct}%</span>
                </div>
                <input type="range" min={5} max={80} step={1} value={marginPct}
                  onChange={e => setMarginPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-gray-200 accent-primary-500 cursor-pointer" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Transport & Pose (DZD)</label>
                <input type="number" value={transportPose}
                  onChange={e => setTransportPose(Math.max(0, Number(e.target.value)))}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-surface-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
              </div>
            </div>

            {/* Résumé */}
            {selectedOrder && (
              <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-5 shadow-card border border-primary-100 space-y-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Salim Hamoun AI v1.5</span>
                    <p className="text-[9px] text-primary-500">{invoice.deducationLabel}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-gray-600">Production</span><span className="font-bold text-gray-900">{fmt(invoice.totalProduction)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Marge ({marginPct}%)</span><span className="font-bold text-gray-900">{fmt(invoice.profit)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Transport</span><span className="font-bold text-gray-900">{fmt(transportPose)}</span></div>
                  <hr className="border-primary-200" />
                  <div className="flex justify-between text-sm"><span className="font-bold text-gray-800">Total HT</span><span className="font-bold text-gray-900">{fmt(invoice.totalHT)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">TVA 19%</span><span className="font-bold text-gray-900">{fmt(invoice.tva)}</span></div>
                  <hr className="border-primary-200" />
                  <div className="flex justify-between"><span className="text-sm font-extrabold text-primary-800">TOTAL TTC</span><span className="text-lg font-extrabold text-primary-800">{fmt(invoice.totalTTC)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: FACTURE ──────────────────────────────────────── */}
          <div className="flex-1 print:flex-none print:w-full">
            <div id="invoice-content" className="bg-surface-50 rounded-2xl shadow-card border border-gray-50 overflow-hidden print:rounded-none print:shadow-none print:border-0">

              {!selectedOrder ? (
                <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                  {loading ? 'Chargement...' : 'Sélectionnez une commande'}
                </div>
              ) : (
                <>
                  {/* HEADER */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 print:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight">
                          <span className="text-amber-400">RM</span><span className="text-orange-400">ASC</span> <span className="text-amber-400">FACTORY</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">Devis d'Ingénierie & Facturation Automatique</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">N° Devis</p>
                        <p className="text-sm font-mono text-amber-400 font-bold">{serialForDisplay}</p>
                      </div>
                    </div>
                  </div>

                  {/* METADATA */}
                  <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="space-y-1">
                      <p><span className="font-medium text-gray-700">Client:</span> {selectedOrder.clientName}</p>
                      <p><span className="font-medium text-gray-700">Ville:</span> {selectedOrder.clientCity}</p>
                      <p><span className="font-medium text-gray-700">Contact:</span> {selectedOrder.clientPhone}{selectedOrder.clientEmail ? ` | ${selectedOrder.clientEmail}` : ''}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p><span className="font-medium text-gray-700">Type:</span> {selectedOrder.typeMotorisation}</p>
                      <p><span className="font-medium text-gray-700">Moteur:</span> {selectedOrder.sousTypeElectrique || 'Standard'}</p>
                      <p><span className="font-medium text-gray-700">Cabine:</span> {selectedOrder.typeCabine} — {detectChargeKg(selectedOrder.typeCabine)} KG</p>
                      <p><span className="font-medium text-gray-700">Surface:</span> {calcCabinArea(selectedOrder.largeurGaineMm, selectedOrder.profondeurGaineMm).toFixed(2)} m²</p>
                    </div>
                  </div>

                  {/* TABLEAU DETAILLE */}
                  <div className="px-8 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-800">Articles & Équipements</h3>
                      <span className="text-[10px] text-gray-400 font-mono">{serialForDisplay}</span>
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[5%]">#</th>
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[12%]">Catégorie</th>
                          <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[33%]">Désignation</th>
                          <th className="text-center pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[8%]">Qté</th>
                          <th className="text-right pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[21%]">Prix Unitaire</th>
                          <th className="text-right pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-[21%]">Prix Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupedLines.map((group, gi) => (
                          <React.Fragment key={gi}>
                            {group.lines.map((line, li) => {
                              const lineNum = invoice.lines.indexOf(line) + 1
                              return (
                                <tr key={`${gi}-${li}`} className="hover:bg-primary-50/30 transition-colors">
                                  <td className="py-2.5 text-xs text-gray-400 font-mono">{lineNum}</td>
                                  <td className="py-2.5">
                                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{line.categorie}</span>
                                  </td>
                                  <td className="py-2.5">
                                    <p className="text-sm font-medium text-gray-800">{line.designation}</p>
                                  </td>
                                  <td className="py-2.5 text-center">
                                    <span className="text-sm font-semibold text-gray-700">{line.qte}</span>
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <span className="text-sm text-gray-600 font-mono">{fmt(line.prixUnitaire)}</span>
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <span className="text-sm font-bold text-gray-900 font-mono">{fmt(line.prixTotal)}</span>
                                  </td>
                                </tr>
                              )
                            })}
                            {/* Sous-total par catégorie */}
                            {group.lines.length > 1 && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={4} className="py-2 text-right pr-4">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sous-total {group.categorie}</span>
                                </td>
                                <td colSpan={2} className="py-2 text-right pr-4">
                                  <span className="text-sm font-bold text-gray-700 font-mono">{fmt(group.sousTotal)}</span>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* TOTAL */}
                  <div className="px-8 pb-5">
                    <hr className="border-gray-300 mb-3" />
                    <div className="flex justify-end">
                      <div className="w-80 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-600">Total Production</span>
                          <span className="font-bold text-gray-800 font-mono">{fmt(invoice.totalProduction)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-600">Marge Commerciale ({marginPct}%)</span>
                          <span className="font-bold text-gray-800 font-mono">{fmt(invoice.profit)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-600">Frais Transport & Pose</span>
                          <span className="font-bold text-gray-800 font-mono">{fmt(transportPose)}</span>
                        </div>
                        <hr className="border-gray-200" />
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-gray-800">TOTAL HT</span>
                          <span className="text-base font-bold text-gray-900 font-mono">{fmt(invoice.totalHT)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">TVA 19%</span>
                          <span className="font-bold text-gray-700 font-mono">{fmt(invoice.tva)}</span>
                        </div>
                        <hr className="border-gray-300 border-t-2" />
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-lg font-extrabold text-primary-700">NET À PAYER</span>
                          <span className="text-xl font-extrabold text-primary-700 font-mono">{fmt(invoice.totalTTC)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 print:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-[10px] text-gray-400">
                        <p className="font-semibold text-gray-600 text-xs">Notes & Conditions</p>
                        <p>• Devis généré par Salim Hamoun AI v1.5 — Grille tarifaire propriétaire</p>
                        <p>• Prix basés sur le type de cabine et la charge nominale ({detectChargeKg(selectedOrder.typeCabine)} KG)</p>
                        <p>• Surface cabine calculée: {calcCabinArea(selectedOrder.largeurGaineMm, selectedOrder.profondeurGaineMm).toFixed(2)} m²</p>
                        <p>• Délai de validité: 30 jours. TVA 19% applicable.</p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 h-14 border-b border-gray-300 mb-1" />
                        <p className="text-[10px] text-gray-400">Cachet & Signature</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-400">
                      <p>RMASC FACTORY — ERP Intégré — {new Date().toLocaleDateString('fr-DZ')}</p>
                      <p className="font-mono">SHAI-v1.5-{serialForDisplay.slice(-6)}</p>
                    </div>
                  </div>

                  <div className="hidden print:block px-8 py-3 text-[8px] text-gray-400 text-center border-t border-gray-100">
                    RMASC FACTORY — Devis d'Ingénierie — {new Date().toLocaleDateString('fr-DZ')}
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
