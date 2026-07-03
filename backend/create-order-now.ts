#!/usr/bin/env tsx
import './src/lib/load-env.js'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const serial = `RMASC-${Date.now().toString(36).toUpperCase().slice(-4)}-TEST`
  console.log('Creating order:', serial)

  const order = await prisma.order.create({
    data: {
      clientName: 'Ascenseurs Test Rapid',
      clientPhone: '+213555000000',
      clientCity: 'Alger',
      serialNumber: serial,
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
      optPanoramique: false, optSecours: true, optAnnoncesVocales: true,
      optCctv: false, optPortesCoupeFeu: true, optPanneauTactile: false,
      status: 'ATTENTE_DESSIN_TECH',
    },
  })
  console.log(`✅ Commande créée: ${order.serialNumber} (id: ${order.id})`)
  console.log('Allez dans le Bureau d\'Études pour la voir.')
  await prisma.$disconnect()
}
main()
