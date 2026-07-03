#!/usr/bin/env tsx
// ─── Integration Test Runner — End-to-End Order Creation ──────────────────
// Simulates a full Admin elevator creation flow:
//   Validate → DB persist (Neon) → PDF generate → Webhook (Electron)
//
// Usage:
//   npx tsx src/scripts/integration-test.ts          # run the test
//   npx tsx src/scripts/integration-test.ts --cleanup  # remove test order from DB
//
// Environment variables loaded from backend/.env.
// ─────────────────────────────────────────────────────────────────────────────

import '../lib/load-env.js'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000'
const TARGET_ELECTRON =
  process.env.ELECTRON_APP_URL ||
  process.env.ELECTRON_SOFTWARE_URL ||
  'http://192.168.0.189:30000/api/integration/receiver'

// ─── Test Payload ───────────────────────────────────────────────────────────
const TEST_SERIAL = 'RMASC-TEST-2026-001'

const TEST_PAYLOAD = {
  // Client info — clientEmail omitted to test optional-field constraint
  clientName: 'Ascenseurs Test Algiers',
  clientEmail: undefined as string | undefined,
  clientPhone: '+213555123456',
  clientCity: 'Bouira',

  // Serial
  serialNumber: TEST_SERIAL,

  // Motorisation
  typeMotorisation: 'ÉLECTRIQUE' as const,
  sousTypeElectrique: 'Sans local (Gearless)',
  vitesseMs: '1.75',
  nombreEtages: '10',

  // Dimensions (mm)
  largeurGaineMm: '1600',
  profondeurGaineMm: '1800',
  hauteurGaineMm: '3600',

  // Matériaux
  materiauCabine: 'Acier Inoxydable Brossé',
  materiauParois: 'Verre Trempé (Stratifié 12mm)',
  materiauPortes: 'Acier Inoxydable Miroir',
  materiauSol: 'Grès Cérame',

  // Options — Alimentation de secours, Annonces vocales, Panneau tactile
  optPanoramique: false,
  optSecours: true,
  optAnnoncesVocales: true,
  optCctv: false,
  optPortesCoupeFeu: false,
  optPanneauTactile: true,
}

// ─── Terminal colours ───────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// ─── Result types ───────────────────────────────────────────────────────────
interface OrderResponse {
  message: string
  order: { id: string; serialNumber: string; status: string; createdAt: string }
  pdf: { fileName: string; url: string } | null
  sync: { success: boolean; error?: string }
}

interface TestResult {
  serial: string
  dbPersisted: boolean
  pdfGenerated: boolean
  syncDispatched: boolean
  elapsedMs: number
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--cleanup')) {
    await cleanupTestOrder(TEST_SERIAL)
    return
  }

  const start = Date.now()
  const result: TestResult = {
    serial: TEST_SERIAL,
    dbPersisted: false,
    pdfGenerated: false,
    syncDispatched: false,
    elapsedMs: 0,
  }

  banner()
  await phase1_format(result)
  const token = await acquireJwt(result)
  result.dbPersisted = await phase2_saveOrder(result, token)
  if (result.dbPersisted) {
    // Phase 3 & 4 outcome is embedded in the API response — we extract it below
  }
  result.elapsedMs = Date.now() - start
  verdict(result)
}

// ─── Phases ─────────────────────────────────────────────────────────────────

async function phase1_format(result: TestResult): Promise<void> {
  log('1', 'Formatting test payload...')
  const json = JSON.stringify(TEST_PAYLOAD, null, 2)
  console.log(C.dim + json.slice(0, 300) + (json.length > 300 ? '\n...' : '') + C.reset)
  ok(`Payload formatted (${json.length} bytes)`)
  console.log()
}

async function acquireJwt(_result: TestResult): Promise<string | null> {
  log('→', 'Acquiring dev JWT...')
  try {
    const res = await fetch(`${API_BASE}/api/auth/dev-login`, { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as { token: string }
    ok('JWT acquired')
    console.log()
    return body.token
  } catch (err) {
    warn(`JWT failed: ${err instanceof Error ? err.message : err}`)
    warn('Proceeding without token (backend may reject 401)')
    console.log()
    return null
  }
}

async function phase2_saveOrder(result: TestResult, token: string | null): Promise<boolean> {
  log('2', 'Sending to backend → database transaction (Neon PostgreSQL)...')

  try {
    const res = await fetch(`${API_BASE}/api/orders/create-and-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(TEST_PAYLOAD),
      signal: AbortSignal.timeout(45_000),
    })

    const body = (await res.json()) as OrderResponse & { error?: string; details?: unknown }

    if (!res.ok) {
      console.error(C.red + `  ✗ API returned HTTP ${res.status}` + C.reset)
      console.error(C.red + `    Error: ${body.error || 'Unknown'}` + C.reset)
      if (body.details) {
        console.error(C.red + `    Details: ${JSON.stringify(body.details)}` + C.reset)
      }
      if (res.status === 409) {
        hint(`Serial "${TEST_SERIAL}" exists. Run: npx tsx src/scripts/integration-test.ts --cleanup`)
      }
      throw new Error(`API error ${res.status}: ${body.error}`)
    }

    // ── Phase 2 complete ───────────────────────────────────────────────────
    ok(`Database transaction complete — order "${body.order.serialNumber}" persisted`)
    info(`Order ID : ${body.order.id}`)
    info(`Status   : ${body.order.status}`)
    info(`Created  : ${body.order.createdAt}`)
    console.log()

    // ── Phase 3: PDF generation ─────────────────────────────────────────────
    log('3', 'Technical PDF generation verification...')
    if (body.pdf) {
      result.pdfGenerated = true
      ok(`Technical PDF generated successfully — ${body.pdf.fileName}`)
      info(`URL : ${body.pdf.url}`)
    } else {
      warn('PDF generation returned null (non-blocking — check server logs)')
    }
    console.log()

    // ── Phase 4: Electron webhook ──────────────────────────────────────────
    log('4', `Sending webhook to Electron at ${TARGET_ELECTRON}...`)
    if (body.sync) {
      if (body.sync.success) {
        result.syncDispatched = true
        ok('Webhook dispatched — Electron app acknowledged')
        successBanner()
      } else {
        warn(`Webhook delivery: ${body.sync.error || 'failed (non-blocking)'}`)
        warn('Order IS saved in Neon DB. The Electron app may be offline.')
        hint(`Ask colleague to start his app at ${TARGET_ELECTRON}`)
      }
    }
    console.log()

    result.dbPersisted = true
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.error(C.red + `  ✗ Request timed out (45s)` + C.reset)
      hint(`Is the backend running at ${API_BASE}?`)
    } else if (!(err instanceof Error && err.message.startsWith('API error'))) {
      console.error(C.red + `  ✗ Network error: ${err instanceof Error ? err.message : err}` + C.reset)
      hint(`Is the backend running at ${API_BASE}?`)
    }
    return false
  }
}

// ─── Verdict ────────────────────────────────────────────────────────────────

function verdict(result: TestResult): void {
  console.log(C.bold + C.cyan + '─'.repeat(60) + C.reset)
  const ok = result.dbPersisted
  if (ok) {
    console.log(C.bold + C.green + '  ✅ INTEGRATION TEST — PASSED' + C.reset)
    console.log(C.green + '     Order persisted in Neon DB ✓' + C.reset)
    console.log(C.green + `     PDF generated: ${result.pdfGenerated ? '✓' : '✗ (non-blocking)'}` + C.reset)
    console.log(C.green + `     Webhook sent  : ${result.syncDispatched ? '✓' : '✗ (non-blocking)'}` + C.reset)
  } else {
    console.log(C.bold + C.red + '  ❌ INTEGRATION TEST — FAILED' + C.reset)
    console.log(C.red + '     DB transaction did not complete.' + C.reset)
    console.log(C.yellow + '     Check server logs above for details.' + C.reset)
  }
  console.log(C.dim + `     Total time  : ${result.elapsedMs}ms` + C.reset)
  console.log(C.dim + `     Serial      : ${result.serial}` + C.reset)
  console.log(C.dim + `     Electron    : ${TARGET_ELECTRON}` + C.reset)
  console.log(C.cyan + '─'.repeat(60) + C.reset + '\n')

  process.exit(ok ? 0 : 1)
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

async function cleanupTestOrder(serial: string): Promise<void> {
  console.log(C.yellow + `🧹 Cleaning up test order "${serial}" from Neon DB...` + C.reset)
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
      // Delete CAD submissions first (FK constraint), then the order
      const order = await prisma.order.findUnique({ where: { serialNumber: serial } })
      if (order) {
        await prisma.cAD_Submission.deleteMany({ where: { orderId: order.id } })
        const deleted = await prisma.order.deleteMany({ where: { serialNumber: serial } })
        console.log(C.green + `  ✓ Removed ${deleted.count} order(s) with serial "${serial}"` + C.reset)
      } else {
        console.log(C.yellow + `  ! No order found with serial "${serial}"` + C.reset)
      }
    } finally {
      await prisma.$disconnect()
    }
  } catch (err) {
    console.error(C.red + `  ✗ Cleanup failed: ${err instanceof Error ? err.message : err}` + C.reset)
    console.log(C.yellow + '  ! Delete the test order manually from the DB.' + C.reset)
  }
  console.log()
  process.exit(0)
}

// ─── Logging helpers ────────────────────────────────────────────────────────

function banner(): void {
  console.log('\n' + C.bold + C.cyan + '═'.repeat(60) + C.reset)
  console.log(C.bold + C.cyan + '  RMASC INTEGRATION TEST — End-to-End Order Creation' + C.reset)
  console.log(C.bold + C.cyan + '═'.repeat(60) + C.reset + '\n')
  console.log(`${C.dim}Serial  : ${C.reset}${C.bold}${TEST_SERIAL}${C.reset}`)
  console.log(`${C.dim}API     : ${C.reset}${API_BASE}`)
  console.log(`${C.dim}Electron: ${C.reset}${TARGET_ELECTRON}`)
  console.log()
}

function log(phase: string, msg: string): void {
  console.log(C.blue + `[TEST ${phase}] ${msg}` + C.reset)
}

function ok(msg: string): void {
  console.log(C.green + `  ✓ ${msg}` + C.reset)
}

function warn(msg: string): void {
  console.log(C.yellow + `  ⚠️  ${msg}` + C.reset)
}

function info(msg: string): void {
  console.log(C.dim + `    ${msg}` + C.reset)
}

function hint(msg: string): void {
  console.log(C.yellow + `  💡 ${msg}` + C.reset)
}

function successBanner(): void {
  console.log()
  console.log(C.bold + C.green + '  >>> ✅ INTEGRATION TEST PASSED — Tell your colleague to check:' + C.reset)
  console.log(C.bold + C.green + '       "Bureau d\'étude #1" software dashboard panel interface view.' + C.reset)
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────
await main()
