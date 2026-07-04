#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Automated MongoDB Cluster Purge & Seed
//  Drops ALL legacy databases, seeds clean RMASC ERP data.
//  Run:  node backend/scripts/clean-database.mjs
// ═══════════════════════════════════════════════════════════════════════════════

import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const URI = 'mongodb+srv://stimaniosboukrif_db_user:Boukrif@cluster0.cz5wbt5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const TARGET_DB = 'rmasc-erp'
const BCRYPT_ROUNDS = 12

const B = '\x1b[1m'
const G = '\x1b[32m'
const Y = '\x1b[33m'
const C = '\x1b[36m'
const R = '\x1b[0m'

function log(s) { console.log(`  ${s}`) }
function ok(s) { console.log(`  ${G}✅ ${s}${R}`) }
function warn(s) { console.log(`  ${Y}⚠️  ${s}${R}`) }

async function main() {
  console.log(`\n${B}${C}══════════════════════════════════════════════════════════${R}`)
  console.log(`${B}${C}  RMASC FACTORY — MONGODB CLUSTER PURGE & SEED${R}`)
  console.log(`${B}${C}══════════════════════════════════════════════════════════${R}\n`)

  // ─── STEP 1 — CONNECT TO CLUSTER (NO DATABASE) ──────────────────────────
  log('1/5 Connecting to MongoDB Atlas (cluster level)...')
  const client = new MongoClient(URI, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 5,
    minPoolSize: 1,
  })
  await client.connect()
  ok('Connected to Atlas')

  const admin = client.db().admin()

  // ─── STEP 2 — LIST AND DROP ALL LEGACY DATABASES ────────────────────────
  log('\n2/5 Scanning and purging legacy databases...')
  const { databases } = await admin.listDatabases()

  for (const dbInfo of databases) {
    const name = dbInfo.name
    const sizeMB = (dbInfo.sizeOnDisk / 1024 / 1024).toFixed(1)

    if (name === 'admin' || name === 'local' || name === 'config') {
      log(`⏭️  SYSTEM  — ${name} (${sizeMB} MB)`)
      continue
    }

    log(`🗑️  PURGING  — ${name} (${sizeMB} MB)`)
    try {
      await client.db(name).dropDatabase()
      ok(`Dropped: ${name}`)
    } catch (err) {
      warn(`Failed to drop ${name}: ${err.message}`)
    }
  }

  // Verify empty
  const after = await admin.listDatabases()
  const legacyCount = after.databases.filter(d => d.name !== 'admin' && d.name !== 'local' && d.name !== 'config').length
  if (legacyCount > 0) {
    warn(`${legacyCount} legacy databases remain — retrying...`)
    for (const dbInfo of after.databases) {
      if (dbInfo.name !== 'admin' && dbInfo.name !== 'local' && dbInfo.name !== 'config') {
        await client.db(dbInfo.name).dropDatabase()
      }
    }
  }

  const final = await admin.listDatabases()
  const finalLegacy = final.databases.filter(d => d.name !== 'admin' && d.name !== 'local' && d.name !== 'config').length
  ok(`Cluster clean — ${finalLegacy} legacy databases remaining`)

  // ─── STEP 3 — CLEAN TARGET DB (fresh start) ────────────────────────────
  log(`\n3/5 Cleaning target database: ${TARGET_DB}...`)
  const db = client.db(TARGET_DB)
  const existingCols = await db.listCollections().toArray()
  if (existingCols.length > 0) {
    for (const c of existingCols) {
      await db.collection(c.name).drop()
    }
    ok(`Dropped ${existingCols.length} stale collections`)
  } else {
    ok('Database already empty')
  }

  // ─── STEP 4 — SEED RMASC ERP DATA ──────────────────────────────────────
  log('\n4/5 Seeding RMASC ERP ecosystem...')

  // 4a — Portal Users (6 accounts with bcrypt passwords)
  log('  👥 Portal Users...')
  const users = [
    { loginId: 'admin',        password: await bcrypt.hash('admin123',     BCRYPT_ROUNDS), name: 'Totok Michael',  role: 'ADMIN',        canChangePassword: true },
    { loginId: 'ingenieur1',   password: await bcrypt.hash('ingenieur1',   BCRYPT_ROUNDS), name: 'Karim Bensalem', role: 'INGENIEUR_1',  canChangePassword: false },
    { loginId: 'ingenieur2',   password: await bcrypt.hash('ingenieur2',   BCRYPT_ROUNDS), name: 'Yasmine Hamidi',  role: 'INGENIEUR_2',  canChangePassword: false },
    { loginId: 'verificateur', password: await bcrypt.hash('verificateur', BCRYPT_ROUNDS), name: 'Rachid Imane',    role: 'VERIFICATEUR', canChangePassword: false },
    { loginId: 'production',   password: await bcrypt.hash('production',   BCRYPT_ROUNDS), name: 'Said Mansouri',   role: 'PRODUCTION',   canChangePassword: false },
    { loginId: 'magasinier',   password: await bcrypt.hash('magasinier',   BCRYPT_ROUNDS), name: 'Ahmed Benali',    role: 'MAGASINIER',   canChangePassword: false },
  ]
  await db.collection('portalusers').insertMany(users)
  ok(`${users.length} portal users`)

  // 4b — Suppliers (5 industrial partners)
  log('  🏢 Suppliers...')
  const sup = await db.collection('suppliers').insertMany([
    { name: 'Mekisan Algerie',     contactName: 'Karim',    email: 'contact@mekisan.dz',     phone: '+213 21 123 456', address: 'Alger' },
    { name: 'AcierPro SPA',        contactName: 'Mohamed',  email: 'info@acierpro.dz',       phone: '+213 23 789 012', address: 'Oran' },
    { name: 'Elevatech SARL',      contactName: 'Ali',      email: 'contact@elevatech.dz',   phone: '+213 29 345 678', address: 'Setif' },
    { name: 'Inox Distribution',   contactName: 'Sofiane',  email: 'commandes@inox.dz',      phone: '+213 25 567 890', address: 'Constantine' },
    { name: 'Hydraulique Services', contactName: 'Redouane', email: 'info@hydrau.dz',         phone: '+213 27 901 234', address: 'Blida' },
  ])
  const sIds = Object.values(sup.insertedIds)
  ok(`${sIds.length} suppliers`)

  // 4c — Stock Items (11 industrial components)
  log('  📦 Stock Items...')
  const items = [
    { reference: 'TLE-001', name: "Tôle d'acier galvanisé 2mm",     description: 'Plaque 2000×1000mm épaisseur 2mm',            category: 'Tôlerie & Métal',         unit: 'Plaque',  location: 'Stock 1', quantity: 45, alertThreshold: 10, unitPrice: 2800,  supplier: sIds[0] },
    { reference: 'TLE-002', name: 'Tôle inox brossé 1.5mm',         description: 'Finition brossé qualité alimentaire',          category: 'Tôlerie & Métal',         unit: 'Plaque',  location: 'Stock 1', quantity: 22, alertThreshold: 5,  unitPrice: 4500,  supplier: sIds[3] },
    { reference: 'PRO-001', name: 'Vérin hydraulique 80mm',          description: 'Course 1500mm, pression max 200 bar',           category: 'Hydraulique',              unit: 'Unité',   location: 'Stock 1', quantity: 8,  alertThreshold: 3,  unitPrice: 15000, supplier: sIds[4] },
    { reference: 'PRO-002', name: 'Moteur traction Gearless 5kW',    description: 'Moteur synchrone à aimants permanents 5kW 32A', category: 'Composants Électriques',   unit: 'Unité',   location: 'Stock 1', quantity: 3,  alertThreshold: 2,  unitPrice: 85000, supplier: sIds[2] },
    { reference: 'FIX-001', name: 'Rail de guidage T45',             description: 'Profilé 5m, acier laminé',                     category: 'Fixations & Quincaillerie',unit: 'Mètre',   location: 'Stock 1', quantity: 120, alertThreshold: 30, unitPrice: 650,   supplier: sIds[1] },
    { reference: 'FIX-002', name: 'Kit patins coulissants',          description: 'Patins PTFE pour rail T45',                    category: 'Fixations & Quincaillerie',unit: 'Lot',     location: 'Stock 1', quantity: 15, alertThreshold: 5,  unitPrice: 3200,  supplier: sIds[1] },
    { reference: 'ELC-001', name: 'Câble électrique 4×2.5mm²',       description: 'Câble cuivre multibrin 50m',                   category: 'Composants Électriques',   unit: 'Rouleau', location: 'Stock 2', quantity: 10, alertThreshold: 3,  unitPrice: 7500,  supplier: sIds[2] },
    { reference: 'ELC-002', name: "Bouton d'arrêt d'urgence",        description: 'Bouton coup de poing rouge',                    category: 'Composants Électriques',   unit: 'Unité',   location: 'Stock 2', quantity: 25, alertThreshold: 8,  unitPrice: 450,   supplier: sIds[2] },
    { reference: 'VIT-001', name: 'Verre trempé 6mm',                description: 'Panneau 1200×2000mm trempé sécurité',           category: 'Vitrerie',                 unit: 'Plaque',  location: 'Stock 2', quantity: 6,  alertThreshold: 2,  unitPrice: 12000, supplier: sIds[0] },
    { reference: 'BOI-001', name: 'Mélaminé blanc laqué',            description: 'Panneau 2800×2070mm ép. 18mm',                  category: 'Bois & Finitions',         unit: 'Plaque',  location: 'Stock 2', quantity: 12, alertThreshold: 4,  unitPrice: 3500,  supplier: sIds[3] },
    { reference: 'CDT-001', name: 'Carton ondulé double cannelure',  description: 'Emballage 1200×800×600mm lot de 10',           category: 'Conditionnement',          unit: 'Lot',     location: 'Stock 2', quantity: 30, alertThreshold: 10, unitPrice: 850,   supplier: null },
  ]
  await db.collection('stockitems').insertMany(items)
  ok(`${items.length} stock items`)

  // 4d — Orders (7 orders — one at each pipeline stage)
  log('  📋 Orders (demo contracts)...')
  const now = Date.now()
  const d = 86400000

  const orders = [
    {
      clientName: 'SARL Batimmo Alger',
      clientEmail: 'contact@batimmo.dz',
      clientPhone: '+213 555 123 456',
      clientCity: 'Alger',
      serialNumber: 'RMASC-2026-A1B2C3',
      status: 'ATTENTE_DESSIN_TECH',
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '1.00',
      nombreEtages: '6',
      largeurGaineMm: '1800', profondeurGaineMm: '2000', hauteurGaineMm: '25000',
      materiauCabine: 'Acier Inoxydable Brossé', materiauPortes: 'Acier Inoxydable Brossé',
      materiauParois: 'Verre Trempé (Stratifié 12mm)',
      lifecycleStage: 'engineering',
      createdAt: new Date(now - 1 * d),
    },
    {
      clientName: 'ETS Hamouda Oran',
      clientEmail: 'contact@hamouda.dz',
      clientPhone: '+213 666 789 012',
      clientCity: 'Oran',
      serialNumber: 'RMASC-2026-D4E5F6',
      status: 'ATTENTE_APPROBATION_ADMIN',   // ⚡ Waiting for Admin approval → then goes to Ing.2
      typeMotorisation: 'HYDRAULIQUE',
      largeurGaineMm: '1600', profondeurGaineMm: '1800', hauteurGaineMm: '15000',
      materiauCabine: 'Acier Inoxydable Miroir',
      lifecycleStage: 'engineering',
      engineeredBy: 'Karim Bensalem',
      createdAt: new Date(now - 2 * d),
    },
    {
      clientName: 'Résidence El Manar',
      clientEmail: 'gestion@elmanar.dz',
      clientPhone: '+213 777 345 678',
      clientCity: 'Setif',
      serialNumber: 'RMASC-2026-G7H8I9',
      status: 'ATTENTE_DESSIN_2D',           // ⚡ Waiting for Engineer 2
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '1.75', nombreEtages: '12',
      largeurGaineMm: '2000', profondeurGaineMm: '2200', hauteurGaineMm: '32000',
      materiauCabine: 'Acier Inoxydable Brossé', materiauPortes: 'Acier Inoxydable Miroir',
      materiauParois: 'Verre Trempé (Stratifié 12mm)',
      typeCabine: 'PASSAGER', typePorte: 'AUTOMATIQUE_CENTRALE', finitionPorteCabine: 'INOX_BROSSE',
      lifecycleStage: 'engineering',
      createdAt: new Date(now - 3 * d),
    },
    {
      clientName: 'Clinique Ibn Sina',
      clientEmail: 'tech@ibnsina.dz',
      clientPhone: '+213 888 901 234',
      clientCity: 'Constantine',
      serialNumber: 'RMASC-2026-J0K1L2',
      status: 'ATTENTE_VERIFICATION',        // ⚡ Waiting for Verifier
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '1.00', nombreEtages: '6',
      largeurGaineMm: '1400', profondeurGaineMm: '1600', hauteurGaineMm: '18000',
      materiauCabine: 'Acier Inoxydable Brossé', materiauPortes: 'Acier Inoxydable Brossé',
      materiauParois: 'Mélaminé / Laminé Haute Pression',
      typeCabine: 'CHARGES_LOURDES',
      lifecycleStage: 'production',
      engineeredBy: 'Yasmine Hamidi',
      totalCostDZD: 297180, salePriceDZD: 512700, marginPct: 30,
      createdAt: new Date(now - 4 * d),
    },
    {
      clientName: 'Résidence El Amel',
      clientPhone: '+213 666 123 456',
      clientCity: 'Blida',
      serialNumber: 'RMASC-2026-K5L6M7',
      status: 'PRET_POUR_PRODUCTION',        // ⚡ Ready for Production
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '1.50', nombreEtages: '8',
      largeurGaineMm: '1500', profondeurGaineMm: '1700', hauteurGaineMm: '20000',
      materiauCabine: 'Acier Inoxydable Miroir', materiauPortes: 'Acier Inoxydable Brossé',
      materiauParois: 'Acier Inoxydable Brossé',
      typeCabine: 'PANORAMIQUE',
      lifecycleStage: 'production',
      engineeredBy: 'Karim Bensalem',
      totalCostDZD: 278400, salePriceDZD: 542300, marginPct: 35,
      createdAt: new Date(now - 5 * d),
    },
    {
      clientName: 'École Polytechnique',
      clientEmail: 'direction@polytech.dz',
      clientPhone: '+213 999 567 890',
      clientCity: 'Blida',
      serialNumber: 'RMASC-2026-M3N4O5',
      status: 'EN_LIVRAISON',                // ⚡ In delivery — waiting for Admin confirmation
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '1.50', nombreEtages: '8',
      largeurGaineMm: '1500', profondeurGaineMm: '1700', hauteurGaineMm: '12000',
      materiauCabine: 'Acier Inoxydable Miroir', materiauPortes: 'Verre Trempé',
      materiauParois: 'Acier Inoxydable Brossé', materiauSol: 'Granit Naturel',
      typeCabine: 'PANORAMIQUE',
      lifecycleStage: 'delivered',
      engineeredBy: 'Yasmine Hamidi',
      totalCostDZD: 278400, salePriceDZD: 542300, marginPct: 35,
      createdAt: new Date(now - 15 * d),
    },
    {
      clientName: 'Hôpital Central Bouira',
      clientEmail: 'direction@hopital-bouira.dz',
      clientPhone: '+213 777 890 123',
      clientCity: 'Bouira',
      serialNumber: 'RMASC-2026-P7Q8R9',
      status: 'LIVREE',                      // ✅ Completed — delivered
      typeMotorisation: 'ÉLECTRIQUE',
      sousTypeElectrique: 'Sans local (Gearless)',
      vitesseMs: '2.00', nombreEtages: '10',
      largeurGaineMm: '2200', profondeurGaineMm: '2400', hauteurGaineMm: '35000',
      materiauCabine: 'Acier Inoxydable Brossé', materiauPortes: 'Acier Inoxydable Miroir',
      materiauParois: 'Verre Trempé (Stratifié 12mm)',
      typeCabine: 'CHARGES_LOURDES',
      lifecycleStage: 'delivered',
      engineeredBy: 'Yasmine Hamidi',
      totalCostDZD: 421180, salePriceDZD: 713800, marginPct: 30,
      completedAt: new Date(now - 2 * d),
      createdAt: new Date(now - 20 * d),
    },
  ]
  const ord = await db.collection('orders').insertMany(orders)
  const oIds = Object.values(ord.insertedIds)
  ok(`${orders.length} orders`)

  // 4e — CAD Submissions (linked to orders)
  log('  📐 CAD Submissions...')
  const cads = [
    { order: oIds[0], engineeringType: 'DESSIN_TECH_1', engineerName: 'Karim Bensalem',  fileHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', fileMimeType: 'application/pdf', fileSizeBytes: 2456000, storageKey: 'cad/rmasc-a1b2c3/plan-installation.pdf', status: 'EN_ATTENTE' },
    { order: oIds[1], engineeringType: 'DESSIN_TECH_1', engineerName: 'Karim Bensalem',  fileHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', fileMimeType: 'application/pdf', fileSizeBytes: 1890000, storageKey: 'cad/rmasc-d4e5f6/plan-installation.pdf', status: 'APPROUVE', approvedAt: new Date(now - 1 * d) },
    { order: oIds[2], engineeringType: 'DESSIN_TECH_1', engineerName: 'Yasmine Hamidi',  fileHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',  fileMimeType: 'application/pdf', fileSizeBytes: 3200000, storageKey: 'cad/rmasc-g7h8i9/plan-installation.pdf', status: 'APPROUVE', approvedAt: new Date(now - 2 * d) },
    { order: oIds[4], engineeringType: 'DESSIN_TECH_1', engineerName: 'Yasmine Hamidi',  fileHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',  fileMimeType: 'application/pdf', fileSizeBytes: 2100000, storageKey: 'cad/rmasc-k5l6m7/plan-installation.pdf', status: 'APPROUVE', approvedAt: new Date(now - 3 * d) },
    { order: oIds[6], engineeringType: 'DESSIN_TECH_1', engineerName: 'Yasmine Hamidi',  fileHash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', fileMimeType: 'application/pdf', fileSizeBytes: 1800000, storageKey: 'cad/rmasc-p7q8r9/plan-installation.pdf', status: 'APPROUVE', approvedAt: new Date(now - 10 * d) },
    { order: oIds[6], engineeringType: 'DESSIN_TECH_2', engineerName: 'Yasmine Hamidi',  fileHash: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', fileMimeType: 'application/pdf', fileSizeBytes: 2100000, storageKey: 'cad/rmasc-p7q8r9/dessin-2d.pdf', status: 'APPROUVE', approvedAt: new Date(now - 8 * d) },
  ]
  await db.collection('cad_submissions').insertMany(cads)
  ok(`${cads.length} CAD submissions`)

  // ─── STEP 5 — VERIFY & REPORT ──────────────────────────────────────────
  log('\n5/5 Verifying seed integrity...')

  const collections = await db.listCollections().toArray()
  const summary = []

  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments()
    summary.push({ name: c.name, count })
  }

  await client.close()

  console.log(`\n${B}${G}══════════════════════════════════════════════════════════${R}`)
  console.log(`${B}${G}  ✅ CLUSTER PURGED & RMASC SEEDED${R}`)
  console.log(`${B}${G}══════════════════════════════════════════════════════════${R}`)
  console.log(`\n${B}📊 Collections:${R}`)
  for (const s of summary) {
    console.log(`     • ${s.name}: ${s.count} documents`)
  }
  console.log(`\n${B}🔐 Login credentials:${R}`)
  console.log(`     admin        / admin123       👑  Direction Générale`)
  console.log(`     ingenieur1   / ingenieur1     📐  Bureau d'Études 1`)
  console.log(`     verificateur / verificateur   🔍  Vérification & Contrôle`)
  console.log(`     production   / production     🏭  Atelier Production`)
  console.log(`     magasinier   / magasinier     📦  Stocks & Logistique`)
  console.log(`\n${B}🚀 Deploy now:${R}`)
  console.log(`     git add . && git commit -m "MongoDB Atlas: cluster purge + RMASC seed" && git push origin deploy:main`)
  console.log(`     npx vercel --prod --yes --token <TOKEN>\n`)
}

main().catch(e => {
  console.error(`\n${R}❌ FATAL: ${e.message}${R}`)
  process.exit(1)
})
