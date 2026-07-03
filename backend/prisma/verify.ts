import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orderCount = await prisma.order.count()
  const cadCount = await prisma.cAD_Submission.count()

  const orders = await prisma.order.findMany({
    select: {
      serialNumber: true,
      clientName: true,
      clientCity: true,
      status: true,
      _count: { select: { cadSubmissions: true } },
    },
  })

  console.log(`\n📊 RMASC — Connexion Neon réussie\n`)
  console.log(`   Ordres:         ${orderCount}`)
  console.log(`   Soumissions CAD: ${cadCount}\n`)
  console.log('   Ordres enregistrés :')
  for (const o of orders) {
    console.log(`     • ${o.serialNumber} — ${o.clientName} (${o.clientCity}) [${o.status}] — ${o._count.cadSubmissions} soumission(s) CAD`)
  }
  console.log('')
}

main().catch(console.error).finally(() => prisma.$disconnect())
