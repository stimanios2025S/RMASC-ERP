#!/usr/bin/env tsx
// ─── PLM Workflow End-to-End Automated Test ───────────────────────────────
// Simulates: Admin injection → Ingénieur 1 → Admin approval → Ingénieur 2
//            → Chief Verifier → PRET_POUR_PRODUCTION
//
// Usage:
//   npx tsx test-plm-flow.ts
//
// Prerequisites:
//   - backend/.env is configured with a valid DATABASE_URL
//   - npx prisma db push has been run (enums exist in PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────

import './src/lib/load-env.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Test data ──────────────────────────────────────────────────────────────
const TEST_SERIAL = `RMASC-TEST-2026-${Date.now().toString(36).toUpperCase().slice(-4)}`

const TEST_PAYLOAD = {
  clientName: 'Résidence Test PLM',
  clientPhone: '+213555000000',
  clientCity: 'Alger',
  serialNumber: TEST_SERIAL,
  typeMotorisation: 'ÉLECTRIQUE',
  sousTypeElectrique: 'Sans local (Gearless)',
  vitesseMs: '1.75',
  nombreEtages: '8',
  largeurGaineMm: '2000',
  profondeurGaineMm: '1800',
  hauteurGaineMm: '28000',
  materiauCabine: 'Acier Inoxydable Brossé',
  materiauPortes: 'Acier Inoxydable Miroir',
  materiauParois: 'Verre Trempé (Stratifié 12mm)',
  materiauSol: 'Grès Cérame',
  optPanoramique: false,
  optSecours: true,
  optAnnoncesVocales: true,
  optCctv: false,
  optPortesCoupeFeu: true,
  optPanneauTactile: false,
}

// ─── Terminal output helpers ────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}

function ok(msg: string) { console.log(C.green + `  ✓ ${msg}` + C.reset) }
function fail(msg: string) { console.log(C.red + `  ✗ ${msg}` + C.reset) }
function info(msg: string) { console.log(C.dim + `    ${msg}` + C.reset) }
function step(num: string, msg: string) { console.log('\n' + C.bold + C.cyan + `[STEP ${num}] ${msg}` + C.reset) }

// ─── Main test flow ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + C.bold + C.cyan + '═'.repeat(60) + C.reset)
  console.log(C.bold + C.cyan + '  RMASC PLM WORKFLOW — End-to-End Automated Test' + C.reset)
  console.log(C.bold + C.cyan + '═'.repeat(60) + C.reset)
  console.log(`${C.dim}Serial : ${C.reset}${TEST_SERIAL}`)

  let orderId = ''
  let passed = 0
  let total = 0

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Admin creates order → ATTENTE_DESSIN_TECH
  // ──────────────────────────────────────────────────────────────────────────
  step('1', 'Admin injection — Création de la commande (ATTENTE_DESSIN_TECH)')
  total++
  try {
    const existing = await prisma.order.findUnique({ where: { serialNumber: TEST_SERIAL } })
    if (existing) {
      await prisma.order.delete({ where: { id: existing.id } })
      info('Commande existante supprimée (nettoyage)')
    }
    const order = await prisma.order.create({
      data: {
        ...TEST_PAYLOAD,
        status: 'ATTENTE_DESSIN_TECH',
      },
    })
    orderId = order.id
    passed++
    ok(`Commande créée: ${order.serialNumber}`)
    info(`ID      : ${order.id}`)
    info(`Status  : ${order.status}`)
    info(`Client  : ${order.clientName}`)
    info(`Dims    : ${order.largeurGaineMm}×${order.profondeurGaineMm}×${order.hauteurGaineMm} mm`)
  } catch (err: any) {
    fail(`Échec création: ${err.message}`)
    if (err?.code) info(`Code Prisma: ${err.code}`)
    if (err?.meta) info(`Meta Prisma: ${JSON.stringify(err.meta)}`)
  }

  if (!orderId) {
    console.log(C.yellow + '\n  ⚠️  Impossible de continuer — la commande n\'a pas été créée.' + C.reset)
    await prisma.$disconnect()
    process.exit(1)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Ingénieur 1 uploads Plan → ATTENTE_APPROBATION_ADMIN
  // ──────────────────────────────────────────────────────────────────────────
  step('2', 'Ingénieur 1 — Envoi du Plan d\'Installation (ATTENTE_APPROBATION_ADMIN)')
  total++
  try {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'ATTENTE_APPROBATION_ADMIN' },
    })
    passed++
    ok(`Status avancé: ${updated.status}`)
  } catch (err: any) {
    fail(`Échec transition: ${err.message}`)
    dumpPrismaError(err)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Admin approves Plan → ATTENTE_DESSIN_2D
  // ──────────────────────────────────────────────────────────────────────────
  step('3', 'Admin — Approbation du Plan (ATTENTE_DESSIN_2D)')
  total++
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (order?.status !== 'ATTENTE_APPROBATION_ADMIN') {
      fail(`Précondition échouée — le status est "${order?.status}"`)
    } else {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'ATTENTE_DESSIN_2D' },
      })
      passed++
      ok(`Status avancé: ${updated.status}`)
    }
  } catch (err: any) {
    fail(`Échec approbation: ${err.message}`)
    dumpPrismaError(err)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Ingénieur 2 uploads 2D → ATTENTE_VERIFICATION (no Admin)
  // ──────────────────────────────────────────────────────────────────────────
  step('4', 'Ingénieur 2 — Envoi Dessin 2D Cabine (ATTENTE_VERIFICATION) — bypass Admin')
  total++
  try {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'ATTENTE_VERIFICATION' },
    })
    passed++
    ok(`Status avancé: ${updated.status}`)
    info('Aucune approbation Admin requise à ce stade.')
  } catch (err: any) {
    fail(`Échec transition: ${err.message}`)
    dumpPrismaError(err)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: Chief Verifier → PRET_POUR_PRODUCTION
  // ──────────────────────────────────────────────────────────────────────────
  step('5', 'Vérificateur en Chef — Soumission à la Production (PRET_POUR_PRODUCTION)')
  total++
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (order?.status !== 'ATTENTE_VERIFICATION') {
      fail(`Précondition échouée — le status est "${order?.status}"`)
    } else {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PRET_POUR_PRODUCTION' },
      })
      passed++
      ok(`Status final: ${updated.status}`)
      info('🏭 Commande prête pour la fabrication.')
    }
  } catch (err: any) {
    fail(`Échec soumission: ${err.message}`)
    dumpPrismaError(err)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VERDICT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n' + C.bold + C.cyan + '─'.repeat(60) + C.reset)
  if (passed === total) {
    console.log(C.bold + C.green + `  ✅ TOUS LES STADES PLM PASSÉS (${passed}/${total})` + C.reset)
    console.log(C.green + '     La pipeline de cycle de vie est opérationnelle.' + C.reset)
  } else {
    console.log(C.bold + C.red + `  ❌ ${total - passed} ÉCHEC(S) (${passed}/${total} passés)` + C.reset)
    console.log(C.yellow + '     Vérifier les messages d\'erreur ci-dessus.' + C.reset)
    console.log(C.yellow + '     Cause probable: enum PostgreSQL non synchronisé.' + C.reset)
    console.log(C.yellow + '     Exécutez:  npx prisma db push' + C.reset)
  }
  console.log(C.dim + `     Série test: ${TEST_SERIAL}` + C.reset)
  console.log(C.cyan + '─'.repeat(60) + C.reset + '\n')

  await prisma.$disconnect()
  process.exit(passed === total ? 0 : 1)
}

function dumpPrismaError(err: any) {
  if (err?.code) info(`Code Prisma : ${err.code}`)
  if (err?.meta) info(`Meta Prisma : ${JSON.stringify(err.meta)}`)
  if (err?.stack) {
    const stackLines = err.stack.split('\n').filter((l: string) => l.includes('test-plm-flow'))
    if (stackLines.length) info(`Stack       : ${stackLines[0].trim()}`)
  }
}

main()
